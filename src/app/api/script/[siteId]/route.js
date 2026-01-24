import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

export async function GET(req, { params }) {
  try {
    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams || {};
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");

    // Always try to get domain from query param first (most reliable)
    let domain = domainParam || "";
    
    // If no domain param, try to get from database
    let bannerConfig = null;
    let siteVerified = false;
    let allowedDomain = null;
    let userId = null;
    if (siteId) {
      const verificationColumns = await hasVerificationColumns();
      try {
        const site = await prisma.site.findUnique({
          where: { siteId },
          select: {
            domain: true,
            bannerConfig: true,
            userId: true,
            ...(verificationColumns.allExist ? { isVerified: true } : {}),
          },
        });
        if (site) {
          if (!domain) {
            domain = site.domain;
          }
          bannerConfig = site.bannerConfig;
          userId = site.userId;

          // If verification columns exist, use them; else fallback to bannerConfig._verification
          if (verificationColumns.allExist) {
            siteVerified = site.isVerified || false;
          } else {
            const v = site?.bannerConfig?._verification;
            siteVerified = (v && v.isVerified) || false;
          }

          allowedDomain = site.domain;
        }
      } catch (error) {
        // If schema mismatch happens, fallback to bannerConfig only
        const site = await prisma.site.findUnique({
          where: { siteId },
          select: { domain: true, bannerConfig: true },
        });
        if (site) {
          if (!domain) domain = site.domain;
          bannerConfig = site.bannerConfig;
          userId = site.userId;
          const v = site?.bannerConfig?._verification;
          siteVerified = (v && v.isVerified) || false;
          allowedDomain = site.domain;
        }
      }
    }
    
    // If still no domain, try to decode from siteId
    if (!domain && siteId) {
      try {
        const decoded = Buffer.from(siteId, "base64").toString("utf-8");
        if (decoded && !decoded.includes("-")) {
          domain = decoded;
        }
      } catch (e) {
        // Ignore decode errors
      }
    }
    
    // Fallback: use wildcard if no domain found
    if (!domain) {
      domain = "*";
    }

    // Check subscription status for this site - block script if subscription is inactive
    if (siteId) {
      const subscriptionStatus = await isSubscriptionActive(siteId);
      if (!subscriptionStatus.isActive) {
        console.warn(`[Script] Subscription inactive for site ${siteId}: ${subscriptionStatus.reason}`);
        // Return a blocked script that shows a message
        const blockedScript = `(function(){
console.error('[Consent SDK] Access denied: Subscription inactive for this domain. ${subscriptionStatus.reason}');
if(typeof window!=='undefined'&&window.console){
window.console.error('[Consent SDK] Please renew your subscription for this domain to continue using the consent script.');
}
})();`;
        return new Response(blockedScript, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      
      // Check page view limit
      const { checkPageViewLimit } = await import("@/lib/subscription");
      const pageViewCheck = await checkPageViewLimit(siteId);
      if (pageViewCheck.exceeded && pageViewCheck.limit !== Infinity) {
        console.warn(`[Script] Page view limit exceeded for site ${siteId}: ${pageViewCheck.currentViews}/${pageViewCheck.limit}`);
        const blockedScript = `(function(){
console.error('[Consent SDK] Access denied: Page view limit exceeded. Current: ${pageViewCheck.currentViews}, Limit: ${pageViewCheck.limit}');
if(typeof window!=='undefined'&&window.console){
window.console.error('[Consent SDK] Please upgrade your plan to continue using the consent script.');
}
})();`;
        return new Response(blockedScript, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }
    
    // Generate siteId for consent key (use provided siteId or generate from domain)
    const finalSiteId = siteId || Buffer.from(domain).toString("base64").replace(/[+/=]/g, "").substring(0, 20);

    // Prepare banner configuration for script
    // Ensure bannerConfig has all required fields
    const bannerConfigForScript = {
      template: bannerConfig?.template || DEFAULT_BANNER_CONFIG.template,
      position: bannerConfig?.position || DEFAULT_BANNER_CONFIG.position,
      title: bannerConfig?.title || DEFAULT_BANNER_CONFIG.title,
      message: bannerConfig?.message || DEFAULT_BANNER_CONFIG.message,
      acceptButtonText: bannerConfig?.acceptButtonText || DEFAULT_BANNER_CONFIG.acceptButtonText,
      rejectButtonText: bannerConfig?.rejectButtonText || DEFAULT_BANNER_CONFIG.rejectButtonText,
      showRejectButton: bannerConfig?.showRejectButton !== undefined ? bannerConfig.showRejectButton : DEFAULT_BANNER_CONFIG.showRejectButton,
    };
    const templateKey = bannerConfigForScript.template || "minimal";
    const bannerTemplate = BANNER_TEMPLATES[templateKey] || BANNER_TEMPLATES.minimal;

    // Common tracker domains to block
    const trackerDomains = [
      "google-analytics.com",
      "googletagmanager.com",
      "facebook.net",
      "connect.facebook.net",
      "doubleclick.net",
      "googleadservices.com",
      "googlesyndication.com",
      "licdn.com",
      "snap.licdn.com",
      "twitter.com",
      "analytics.twitter.com",
      "hotjar.com",
      "clarity.ms",
      "omniture.com",
      "adobe.com"
    ];

    // Get base URL for verification callback and tracking
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const verifyCallbackUrl = `${baseUrl}/api/sites/${finalSiteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${finalSiteId}/track`;

    // Generate a simple, reliable script
    const script = `(function(){
console.log('[Consent SDK] Loading...', window.location.href);
var DOMAIN="${domain.replace(/"/g, '\\"')}";
var ALLOWED_DOMAIN="${allowedDomain ? allowedDomain.replace(/"/g, '\\"') : "*"}";
var IS_VERIFIED=${siteVerified ? "true" : "false"};
var TRACKERS=${JSON.stringify(trackerDomains)};
var SITE_ID="${finalSiteId.replace(/"/g, '\\"')}";
var CONSENT_KEY='cookie_consent_'+SITE_ID;
var consent=localStorage.getItem(CONSENT_KEY)==='accepted';

// CRITICAL: Set up blocking IMMEDIATELY before anything else
function isTracker(url){
if(!url)return false;
var urlStr=String(url).toLowerCase();
for(var i=0;i<TRACKERS.length;i++){
if(urlStr.indexOf(TRACKERS[i].toLowerCase())>-1)return true;
}
return false;
}

function blockScript(s){
if(s&&s.type!=='javascript/blocked'){
s.setAttribute('data-original-type',s.type||'text/javascript');
s.type='javascript/blocked';
console.log('[Consent SDK] Blocked script:',s.src||s.getAttribute('src'));
}
}

// Block existing scripts IMMEDIATELY
if(!consent){
console.log('[Consent SDK] Blocking trackers - consent not granted');
var existingScripts=document.querySelectorAll('script[src]');
existingScripts.forEach(function(s){
if(isTracker(s.src)){
blockScript(s);
console.log('[Consent SDK] Blocked existing script:',s.src);
}
});
}

// Store original functions BEFORE intercepting
var origCreate=document.createElement;
var origFetch=window.fetch;
var origXHROpen=XMLHttpRequest.prototype.open;
var origXHRSend=XMLHttpRequest.prototype.send;

// Intercept createElement IMMEDIATELY
document.createElement=function(tag){
var el=origCreate.call(document,tag);
if(tag.toLowerCase()==='script'&&!consent){
var src='';
Object.defineProperty(el,'src',{
get:function(){return src;},
set:function(v){
src=v;
if(v)el.setAttribute('src',v);
// Check consent dynamically
if(isTracker(v)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
blockScript(el);
console.log('[Consent SDK] Blocked new script:',v);
}
}
});
// Also check if src is set via setAttribute
var originalSetAttribute=el.setAttribute;
el.setAttribute=function(name,value){
originalSetAttribute.call(this,name,value);
if(name==='src'&&isTracker(value)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
blockScript(el);
console.log('[Consent SDK] Blocked script via setAttribute:',value);
}
};
}
return el;
};

// Intercept fetch IMMEDIATELY - handle both fetch(url) and fetch(url, options)
window.fetch=function(input,init){
var url=typeof input==='string'?input:(input&&input.url?input.url:'');
if(url&&isTracker(url)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
console.log('[Consent SDK] Blocked fetch:',url);
return Promise.reject(new Error('Blocked by consent manager'));
}
return origFetch.apply(this,arguments);
};

// Intercept XHR open and send IMMEDIATELY
XMLHttpRequest.prototype.open=function(method,url){
if(isTracker(url)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
console.log('[Consent SDK] Blocked XHR open:',url);
this._blocked=true;
this._blockedUrl=url;
return;
}
this._blocked=false;
return origXHROpen.apply(this,arguments);
};

XMLHttpRequest.prototype.send=function(data){
if(this._blocked){
console.log('[Consent SDK] Blocked XHR send:',this._blockedUrl);
return;
}
return origXHRSend.apply(this,arguments);
};

console.log('[Consent SDK] Tracker blocking initialized');

// Domain check first - only work on matching domain
var currentHost=window.location.hostname.toLowerCase();
var allowedHost=ALLOWED_DOMAIN !== "*" ? ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,'') : null;
currentHost=currentHost.replace(/^www\\./,'');

if(allowedHost && currentHost !== allowedHost){
console.warn('[Consent SDK] Domain mismatch. Current:',currentHost,'Allowed:',allowedHost);
console.warn('[Consent SDK] Script will not work on this domain.');
return; // Exit if domain doesn't match
}

console.log('[Consent SDK] Domain matches:',currentHost);

// Auto-connect domain by calling verification callback (always try to connect)
console.log('[Consent SDK] Attempting to connect domain...');
(function connectDomain(){
try{
var currentDomain=window.location.hostname.toLowerCase().replace(/^www\\./,'');
var verifyUrl="${verifyCallbackUrl.replace(/"/g, '\\"')}?domain="+encodeURIComponent(currentDomain);
console.log('[Consent SDK] Calling verification endpoint:',verifyUrl);
console.log('[Consent SDK] Current domain:',currentDomain);
console.log('[Consent SDK] Allowed domain:',allowedHost||'*');

var fetchOptions={
method:'GET',
mode:'cors',
credentials:'omit',
headers:{'Accept':'application/json'},
cache:'no-cache'
};

fetch(verifyUrl,fetchOptions).then(function(r){
console.log('[Consent SDK] Verification response status:',r.status);
console.log('[Consent SDK] Response headers:',r.headers);
if(!r.ok){
console.warn('[Consent SDK] Connection request failed:',r.status,r.statusText);
return r.text().then(function(text){
console.log('[Consent SDK] Error response body:',text);
try{
var parsed=JSON.parse(text);
console.error('[Consent SDK] Parsed error:',parsed);
return parsed;
}catch(e){
console.error('[Consent SDK] Could not parse error response:',e);
return {error:text};
}
});
}
return r.json();
}).then(function(data){
console.log('[Consent SDK] Verification response data:',JSON.stringify(data));
if(data&&data.connected){
console.log('[Consent SDK] ✓ Domain connected successfully!');
IS_VERIFIED=true;
// Try to notify user (optional)
if(typeof window!=='undefined'&&window.console&&window.console.info){
window.console.info('[Consent SDK] Domain connection successful!');
}
}else if(data){
console.warn('[Consent SDK] Connection failed:',data.error||'Unknown error',data);
if(data.requestDomain && data.storedDomain){
console.warn('[Consent SDK] Domain mismatch - Request:',data.requestDomain,'Stored:',data.storedDomain);
}
if(data.debug){
console.warn('[Consent SDK] Debug info:',data.debug);
}
}
}).catch(function(err){
console.error('[Consent SDK] Connection request error:',err);
console.error('[Consent SDK] Error details:',{
message:err.message,
stack:err.stack,
name:err.name
});
// Retry once after 2 seconds if it's a network error
if(err.message&&(err.message.includes('fetch')||err.message.includes('network')||err.message.includes('Failed to fetch'))){
console.log('[Consent SDK] Network error detected, will retry in 2 seconds...');
setTimeout(connectDomain,2000);
}
});
}catch(e){
console.error('[Consent SDK] Error in connectDomain function:',e);
}
})();

// Track page view
(function trackPageView(){
try{
var trackData={
pagePath:window.location.pathname+window.location.search,
pageTitle:document.title||null,
userAgent:navigator.userAgent||null,
referer:document.referrer||null
};
fetch("${trackUrl.replace(/"/g, '\\"')}",{
method:'POST',
mode:'cors',
credentials:'omit',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(trackData),
cache:'no-cache'
}).then(function(r){
if(r.ok){
console.log('[Consent SDK] Page view tracked');
}else{
console.warn('[Consent SDK] Failed to track page view:',r.status);
}
}).catch(function(err){
console.warn('[Consent SDK] Page view tracking error:',err.message);
});
}catch(e){
console.warn('[Consent SDK] Error tracking page view:',e.message);
}
})();

console.log('[Consent SDK] Script loaded successfully');
console.log('[Consent SDK] Consent status:', consent, 'Key:', CONSENT_KEY);
console.log('[Consent SDK] Document ready state:', document.readyState);
console.log('[Consent SDK] Body exists:', !!document.body);

function showBanner(){
console.log('[Consent SDK] showBanner called, consent:', consent, 'banner exists:', !!document.getElementById('cookie-banner'));
if(consent||document.getElementById('cookie-banner'))return;
if(!document.body){
console.log('[Consent SDK] Body not ready, retrying in 100ms');
setTimeout(showBanner,100);
return;
}
console.log('[Consent SDK] Attempting to create banner...');
try{
var cfg=${JSON.stringify(bannerConfigForScript)};
var tmpl=${JSON.stringify(bannerTemplate)};
var pos=cfg.position==='top'?'top:0;bottom:auto;':'bottom:0;top:auto;';
var b=document.createElement('div');
b.id='cookie-banner';
var bgColor=tmpl.style.backgroundColor||'#667eea';
var textColor=tmpl.style.textColor||'#ffffff';
var btnColor=tmpl.style.buttonColor||'#ffffff';
var btnTextColor=tmpl.style.buttonTextColor||'#667eea';
var padding=tmpl.style.padding||'20px';
var fontSize=tmpl.style.fontSize||'14px';
var borderRadius=tmpl.style.borderRadius||'8px';
var border=tmpl.style.border||'';
var boxShadow=tmpl.style.boxShadow||'';
b.style.cssText='position:fixed;'+pos+'left:0;right:0;background:'+bgColor+';color:'+textColor+';padding:'+padding+';z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:'+fontSize+';border-radius:'+borderRadius+';'+(border?'border:'+border+';':'')+(boxShadow?'box-shadow:'+boxShadow+';':'');
var acceptBtn=cfg.acceptButtonText||'Accept';
var rejectBtn=cfg.rejectButtonText||'Reject';
var title=cfg.title||'🍪 We use cookies';
var message=cfg.message||'This site uses tracking cookies. Accept to enable analytics.';
var showReject=cfg.showRejectButton!==false;
var titleEscaped=title.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var messageEscaped=message.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var acceptBtnEscaped=acceptBtn.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var rejectBtnEscaped=rejectBtn.replace(/'/g,"\\'").replace(/"/g,'&quot;');
b.innerHTML='<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;font-weight:600;">'+titleEscaped+'</h3><p style="margin:0;opacity:0.9;line-height:1.5;">'+messageEscaped+'</p></div><div style="display:flex;gap:10px;flex-wrap:wrap;"><button id="accept-btn" style="background:'+btnColor+';color:'+btnTextColor+';border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:'+fontSize+';transition:opacity 0.2s;" onmouseover="this.style.opacity=\\'0.9\\'" onmouseout="this.style.opacity=\\'1\\'">'+acceptBtnEscaped+'</button>'+(showReject?'<button id="reject-btn" style="background:transparent;color:'+textColor+';border:2px solid '+textColor+';padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:'+fontSize+';transition:opacity 0.2s;" onmouseover="this.style.opacity=\\'0.9\\'" onmouseout="this.style.opacity=\\'1\\'">'+rejectBtnEscaped+'</button>':'')+'</div>';
document.body.appendChild(b);
var acceptBtnEl=document.getElementById('accept-btn');
if(acceptBtnEl){
acceptBtnEl.onclick=function(){
consent=true;
localStorage.setItem(CONSENT_KEY,'accepted');
b.remove();
enableTrackers();
};
}
if(showReject){
var rejectBtnEl=document.getElementById('reject-btn');
if(rejectBtnEl){
rejectBtnEl.onclick=function(){
localStorage.setItem(CONSENT_KEY,'rejected');
b.remove();
};
}
}
console.log('[Consent SDK] Banner shown successfully');
console.log('[Consent SDK] Banner element:', document.getElementById('cookie-banner'));
}catch(e){
console.error('[Consent SDK] Error showing banner:',e);
console.error('[Consent SDK] Error stack:', e.stack);
// Fallback to simple banner
var fallback=document.createElement('div');
fallback.id='cookie-banner';
fallback.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:sans-serif;';
fallback.innerHTML='<div style="flex:1;"><h3 style="margin:0 0 8px 0;font-size:18px;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;">This site uses tracking cookies. Accept to enable analytics.</p></div><div style="display:flex;gap:10px;"><button id="accept-btn-fallback" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button><button id="reject-btn-fallback" style="background:transparent;color:#fff;border:2px solid #fff;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Reject</button></div>';
document.body.appendChild(fallback);
document.getElementById('accept-btn-fallback').onclick=function(){
consent=true;
localStorage.setItem(CONSENT_KEY,'accepted');
fallback.remove();
enableTrackers();
};
document.getElementById('reject-btn-fallback').onclick=function(){
localStorage.setItem(CONSENT_KEY,'rejected');
fallback.remove();
};
}
}

function enableTrackers(){
console.log('[Consent SDK] Enabling trackers...');
consent=true;
localStorage.setItem(CONSENT_KEY,'accepted');

// Restore blocked scripts
document.querySelectorAll('script[type="javascript/blocked"]').forEach(function(s){
var n=document.createElement('script');
n.src=s.src||s.getAttribute('src');
if(s.hasAttribute('async'))n.async=true;
if(s.hasAttribute('defer'))n.defer=true;
if(s.id)n.id=s.id;
if(s.className)n.className=s.className;
// Copy all data attributes
for(var i=0;i<s.attributes.length;i++){
var attr=s.attributes[i];
if(attr.name.startsWith('data-'))n.setAttribute(attr.name,attr.value);
}
s.parentNode.replaceChild(n,s);
console.log('[Consent SDK] Restored script:',n.src);
});

// Restore original functions
document.createElement=origCreate;
window.fetch=origFetch;
XMLHttpRequest.prototype.open=origXHROpen;
XMLHttpRequest.prototype.send=origXHRSend;

console.log('[Consent SDK] All trackers enabled');
}

// Only show banner if consent not granted
if(!consent){
// Try to show banner immediately
showBanner();
// Also set up multiple fallbacks to ensure banner shows
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',function(){
setTimeout(showBanner,100);
});
}
// Multiple timeouts to ensure banner shows even if page loads slowly
setTimeout(showBanner,100);
setTimeout(showBanner,500);
setTimeout(showBanner,1000);
setTimeout(showBanner,2000);
setTimeout(showBanner,3000);
// Also try when window loads
window.addEventListener('load',function(){
setTimeout(showBanner,100);
});
}else{
console.log('[Consent SDK] Consent already granted - trackers enabled');
}

console.log('[Consent SDK] Initialized - Consent:',consent?'granted':'not granted');
})();`;

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=60, must-revalidate", // Reduced to 60 seconds to allow banner updates to show quickly
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("Script generation error:", error);
    // Even on error, return a working script with default values
    const fallbackScript = `(function(){
console.log('[Consent SDK] Error occurred, using fallback');
var TRACKERS=["google-analytics.com","googletagmanager.com","facebook.net","connect.facebook.net"];
var CONSENT_KEY='cookie_consent_fallback';
var consent=localStorage.getItem(CONSENT_KEY)==='accepted';
function isTracker(url){if(!url)return false;for(var i=0;i<TRACKERS.length;i++){if(url.indexOf(TRACKERS[i])>-1)return true;}return false;}
function blockScript(s){if(s.type!=='javascript/blocked'){s.setAttribute('data-original-type',s.type||'text/javascript');s.type='javascript/blocked';}}
function showBanner(){if(consent||document.getElementById('cookie-banner'))return;if(!document.body){setTimeout(showBanner,100);return;}
var b=document.createElement('div');b.id='cookie-banner';b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:sans-serif;';
b.innerHTML='<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;">This site uses tracking cookies. Accept to enable analytics.</p></div><div style="display:flex;gap:10px;"><button id="accept-btn" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button><button id="reject-btn" style="background:transparent;color:#fff;border:2px solid #fff;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Reject</button></div>';
document.body.appendChild(b);
document.getElementById('accept-btn').onclick=function(){consent=true;localStorage.setItem(CONSENT_KEY,'accepted');b.remove();};
document.getElementById('reject-btn').onclick=function(){localStorage.setItem(CONSENT_KEY,'rejected');b.remove();};}
if(!consent){document.querySelectorAll('script[src]').forEach(function(s){if(isTracker(s.src))blockScript(s);});}
showBanner();setTimeout(showBanner,500);setTimeout(showBanner,2000);
})();`;
    return new Response(fallbackScript, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=60, must-revalidate", // Reduced to 60 seconds to allow banner updates to show quickly
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  }
}
