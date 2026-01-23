import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";

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
    if (siteId) {
      const site = await prisma.site.findUnique({
        where: { siteId },
        select: { domain: true, bannerConfig: true, isVerified: true },
      });
      if (site) {
        if (!domain) {
          domain = site.domain;
        }
        bannerConfig = site.bannerConfig;
        siteVerified = site.isVerified || false;
        allowedDomain = site.domain;
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

    // Generate a simple, reliable script
    const script = `(function(){
console.log('[Consent SDK] Loading...', window.location.href);
console.log('[Consent SDK] Script loaded successfully');
var DOMAIN="${domain.replace(/"/g, '\\"')}";
var ALLOWED_DOMAIN="${allowedDomain ? allowedDomain.replace(/"/g, '\\"') : "*"}";
var IS_VERIFIED=${siteVerified ? "true" : "false"};
var TRACKERS=${JSON.stringify(trackerDomains)};
var SITE_ID="${finalSiteId.replace(/"/g, '\\"')}";
var CONSENT_KEY='cookie_consent_'+SITE_ID;
var consent=localStorage.getItem(CONSENT_KEY)==='accepted';

// Domain verification check - only work on verified domain
if(IS_VERIFIED && ALLOWED_DOMAIN !== "*"){
var currentHost=window.location.hostname.toLowerCase();
var allowedHost=ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,'');
currentHost=currentHost.replace(/^www\\./,'');
if(currentHost !== allowedHost){
console.warn('[Consent SDK] Domain mismatch. Current:',currentHost,'Allowed:',allowedHost);
console.warn('[Consent SDK] Script will not work on this domain. Please verify domain ownership.');
return; // Exit if domain doesn't match
}
console.log('[Consent SDK] Domain verified:',currentHost,'matches allowed domain:',allowedHost);
}
console.log('[Consent SDK] Consent status:', consent, 'Key:', CONSENT_KEY);
console.log('[Consent SDK] Document ready state:', document.readyState);
console.log('[Consent SDK] Body exists:', !!document.body);

function isTracker(url){
if(!url)return false;
for(var i=0;i<TRACKERS.length;i++){
if(url.indexOf(TRACKERS[i])>-1)return true;
}
return false;
}

function blockScript(s){
if(s.type!=='javascript/blocked'){
s.setAttribute('data-original-type',s.type||'text/javascript');
s.type='javascript/blocked';
console.log('[Consent SDK] Blocked:',s.src);
}
}

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

var origCreate,origFetch,origXHR;

function enableTrackers(){
console.log('[Consent SDK] Enabling trackers...');
consent=true;

// Restore blocked scripts
document.querySelectorAll('script[type="javascript/blocked"]').forEach(function(s){
var n=document.createElement('script');
n.src=s.src;
if(s.hasAttribute('async'))n.async=true;
if(s.hasAttribute('defer'))n.defer=true;
if(s.id)n.id=s.id;
s.parentNode.replaceChild(n,s);
console.log('[Consent SDK] Restored script:',s.src);
});

// Restore original createElement
if(origCreate){
document.createElement=origCreate;
console.log('[Consent SDK] Restored createElement');
}

// Restore original fetch
if(origFetch){
window.fetch=origFetch;
console.log('[Consent SDK] Restored fetch');
}

// Restore original XHR
if(origXHR){
XMLHttpRequest.prototype.open=origXHR;
console.log('[Consent SDK] Restored XHR');
}

console.log('[Consent SDK] All trackers enabled');
}

if(!consent){
// Block existing scripts
document.querySelectorAll('script[src]').forEach(function(s){
if(isTracker(s.src))blockScript(s);
});

// Store original functions
origCreate=document.createElement;
origFetch=window.fetch;
origXHR=XMLHttpRequest.prototype.open;

// Intercept createElement
document.createElement=function(tag){
var el=origCreate.call(document,tag);
if(tag.toLowerCase()==='script'){
var src='';
Object.defineProperty(el,'src',{
get:function(){return src;},
set:function(v){
src=v;
el.setAttribute('src',v);
// Check consent dynamically
if(isTracker(v)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
blockScript(el);
}
}
});
}
return el;
};

// Intercept fetch
window.fetch=function(url){
// Check consent dynamically
if(typeof url==='string'&&isTracker(url)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
console.log('[Consent SDK] Blocked fetch:',url);
return Promise.reject(new Error('Blocked'));
}
return origFetch.apply(this,arguments);
};

// Intercept XHR
XMLHttpRequest.prototype.open=function(method,url){
// Check consent dynamically
if(isTracker(url)&&localStorage.getItem(CONSENT_KEY)!=='accepted'){
console.log('[Consent SDK] Blocked XHR:',url);
return;
}
return origXHR.apply(this,arguments);
};

console.log('[Consent SDK] Blocking active');
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
