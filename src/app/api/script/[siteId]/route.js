import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const { siteId } = resolvedParams || {};
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");
    const isPreview = searchParams.get("preview") === "1";
    const previewConfigParam = searchParams.get("config");

    let domain = domainParam || "";
    
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
          if (verificationColumns.allExist) {
            siteVerified = site.isVerified || false;
          } else {
            const v = site?.bannerConfig?._verification;
            siteVerified = (v && v.isVerified) || false;
          }
          allowedDomain = site.domain;
        }
      } catch (error) {
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
    
    if (!domain && siteId) {
      try {
        const decoded = Buffer.from(siteId, "base64").toString("utf-8");
        if (decoded && !decoded.includes("-")) {
          domain = decoded;
        }
      } catch (e) {}
    }
    
    if (!domain) {
      domain = "*";
    }

    // Check subscription status
    if (siteId && !isPreview) {
      let subscriptionStatus = await isSubscriptionActive(siteId);
      
      if (!subscriptionStatus.isActive && subscriptionStatus.subscription?.status === "pending" && 
          (subscriptionStatus.subscription?.paddleTransactionId || subscriptionStatus.subscription?.paddleSubscriptionId)) {
        try {
          const syncSubscriptionId = subscriptionStatus.subscription.paddleSubscriptionId || subscriptionStatus.subscription.paddleTransactionId;
          if (syncSubscriptionId) {
            const { fetchPaddleSubscription } = await import("@/lib/paddle");
            const { startUserTrial } = await import("@/lib/subscription");
            
            try {
              const paddleSub = await fetchPaddleSubscription(syncSubscriptionId);
              if (paddleSub) {
                const paddleStatus = paddleSub.status;
                if (paddleStatus === "active" || paddleStatus === "trialing") {
                  const site = await prisma.site.findUnique({
                    where: { id: subscriptionStatus.subscription.siteId },
                    include: { user: true },
                  });
                  
                  if (site) {
                    await startUserTrial(site.userId);
                    await prisma.subscription.update({
                      where: { id: subscriptionStatus.subscription.id },
                      data: {
                        status: paddleStatus === "trialing" ? "trial" : "active",
                        paddleSubscriptionId: paddleSub.id || subscriptionStatus.subscription.paddleSubscriptionId,
                        currentPeriodStart: paddleSub.current_billing_period?.starts_at 
                          ? new Date(paddleSub.current_billing_period.starts_at)
                          : new Date(),
                        currentPeriodEnd: paddleSub.current_billing_period?.ends_at
                          ? new Date(paddleSub.current_billing_period.ends_at)
                          : (() => {
                              const end = new Date();
                              end.setMonth(end.getMonth() + 1);
                              return end;
                            })(),
                        updatedAt: new Date(),
                      },
                    });
                    subscriptionStatus = await isSubscriptionActive(siteId);
                  }
                }
              }
            } catch (syncError) {
              console.warn(`[Script] Could not sync subscription from Paddle:`, syncError.message);
            }
          }
        } catch (error) {
          console.warn(`[Script] Error during subscription sync:`, error.message);
        }
      }
      
      if (!subscriptionStatus.isActive) {
        const blockedScript = `(function(){console.error('[Consent SDK] Access denied: Subscription inactive for this domain. ${subscriptionStatus.reason}');})();`;
        return new Response(blockedScript, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      
      const { checkPageViewLimit } = await import("@/lib/subscription");
      const pageViewCheck = await checkPageViewLimit(siteId);
      if (pageViewCheck.exceeded && pageViewCheck.limit !== Infinity) {
        const blockedScript = `(function(){console.error('[Consent SDK] Access denied: Page view limit exceeded.');})();`;
        return new Response(blockedScript, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }
    
    const finalSiteId = siteId || Buffer.from(domain).toString("base64").replace(/[+/=]/g, "").substring(0, 20);

    let normalizedBannerConfig = bannerConfig;
    if (typeof normalizedBannerConfig === "string") {
      try {
        normalizedBannerConfig = JSON.parse(normalizedBannerConfig);
      } catch {
        normalizedBannerConfig = null;
      }
    }

    let previewConfig = null;
    if (isPreview && previewConfigParam) {
      try {
        const decoded = Buffer.from(decodeURIComponent(previewConfigParam), "base64").toString("utf-8");
        previewConfig = JSON.parse(decoded);
      } catch {
        previewConfig = null;
      }
    }

    const effectiveConfig = previewConfig || normalizedBannerConfig || {};

    // Get template and merge with config
    const templateKey = effectiveConfig.template || DEFAULT_BANNER_CONFIG.template;
    const baseTemplate = BANNER_TEMPLATES[templateKey] || BANNER_TEMPLATES.minimal;
    
    // Merge template styles with config overrides
    const bannerStyle = {
      backgroundColor: effectiveConfig.backgroundColor || baseTemplate.style.backgroundColor || '#667eea',
      textColor: effectiveConfig.textColor || baseTemplate.style.textColor || '#ffffff',
      buttonColor: effectiveConfig.buttonColor || baseTemplate.style.buttonColor || '#ffffff',
      buttonTextColor: effectiveConfig.buttonTextColor || baseTemplate.style.buttonTextColor || '#667eea',
      borderRadius: effectiveConfig.borderRadius || baseTemplate.style.borderRadius || '8px',
      padding: effectiveConfig.padding || baseTemplate.style.padding || '20px',
      fontSize: effectiveConfig.fontSize || baseTemplate.style.fontSize || '14px',
      border: effectiveConfig.border || baseTemplate.style.border || '',
      boxShadow: effectiveConfig.boxShadow || baseTemplate.style.boxShadow || '',
    };

    const position = effectiveConfig.position || baseTemplate.position || DEFAULT_BANNER_CONFIG.position;
    const title = (effectiveConfig.title || DEFAULT_BANNER_CONFIG.title).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const message = (effectiveConfig.message || effectiveConfig.description || DEFAULT_BANNER_CONFIG.message).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const acceptText = (effectiveConfig.acceptButtonText || effectiveConfig.acceptText || DEFAULT_BANNER_CONFIG.acceptButtonText).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const rejectText = (effectiveConfig.rejectButtonText || effectiveConfig.rejectText || DEFAULT_BANNER_CONFIG.rejectButtonText).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const showReject = effectiveConfig.showRejectButton !== false;

    // Comprehensive tracker domains list including Meta Pixel
    const trackerDomains = [
      "google-analytics.com",
      "www.google-analytics.com",
      "googletagmanager.com",
      "www.googletagmanager.com",
      "gtag.js",
      "analytics.js",
      "ga.js",
      "facebook.net",
      "connect.facebook.net",
      "www.facebook.com/tr",
      "facebook.com/tr",
      "fbevents.js",
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
      "adobe.com",
      "segment.io",
      "segment.com",
      "mixpanel.com",
      "amplitude.com"
    ];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const verifyCallbackUrl = `${baseUrl}/api/sites/${finalSiteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${finalSiteId}/track`;

    // Generate a clean, simple script without complex escaping
    const script = `(function(){
'use strict';
console.log('[Consent SDK] Starting...');

var SITE_ID='${finalSiteId}';
var CONSENT_KEY='cookie_consent_'+SITE_ID;
var TRACKERS=${JSON.stringify(trackerDomains)};
var isPreviewMode=${isPreview ? 'true' : 'false'};
var ALLOWED_DOMAIN='${isPreview ? '*' : (allowedDomain || '*')}';

// Clear consent in preview mode
if(isPreviewMode){
  console.log('[Consent SDK] Preview mode - clearing consent');
  localStorage.removeItem(CONSENT_KEY);
  var existing=document.getElementById('cookie-banner');
  if(existing)existing.remove();
}

// Check consent
function hasConsent(){
  return localStorage.getItem(CONSENT_KEY)==='accepted';
}

// Tracker detection
function isTracker(url){
  if(!url)return false;
  var u=String(url).toLowerCase();
  for(var i=0;i<TRACKERS.length;i++){
    if(u.indexOf(TRACKERS[i])>-1)return true;
  }
  return false;
}

// Block script
function blockScript(s){
  if(s&&s.type!=='javascript/blocked'){
    s.setAttribute('data-original-type',s.type||'text/javascript');
    s.type='javascript/blocked';
    console.log('[Consent SDK] Blocked:',s.src||'inline');
  }
}

// Block existing tracker scripts
if(!hasConsent()){
  console.log('[Consent SDK] Blocking trackers');
  var scripts=document.querySelectorAll('script[src]');
  for(var i=0;i<scripts.length;i++){
    if(isTracker(scripts[i].src)){
      blockScript(scripts[i]);
    }
  }
}

// Store original functions
var origCreate=document.createElement;
var origFetch=window.fetch;

// Intercept createElement
document.createElement=function(tag){
  var el=origCreate.call(document,tag);
  if(tag.toLowerCase()==='script'){
    var _src='';
    Object.defineProperty(el,'src',{
      get:function(){return _src;},
      set:function(v){
        _src=v;
        if(v)el.setAttribute('src',v);
        if(isTracker(v)&&!hasConsent()){
          blockScript(el);
        }
      }
    });
  }
  return el;
};

// Intercept fetch
window.fetch=function(input,init){
  var url=typeof input==='string'?input:(input&&input.url?input.url:'');
  if(isTracker(url)&&!hasConsent()){
    console.log('[Consent SDK] Blocked fetch:',url);
    return Promise.reject(new Error('Blocked by consent'));
  }
  return origFetch.apply(this,arguments);
};

// Block Meta Pixel fbq function
if(!hasConsent()){
  window.fbq=function(){
    console.log('[Consent SDK] Blocked fbq call');
    return false;
  };
  if(window._fbq)window._fbq=window.fbq;
}

// Intercept XMLHttpRequest
var origXHROpen=XMLHttpRequest.prototype.open;
var origXHRSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url){
  if(isTracker(url)&&!hasConsent()){
    console.log('[Consent SDK] Blocked XHR:',url);
    this._blocked=true;
    return;
  }
  this._blocked=false;
  return origXHROpen.apply(this,arguments);
};
XMLHttpRequest.prototype.send=function(data){
  if(this._blocked){
    console.log('[Consent SDK] Blocked XHR send');
    return;
  }
  return origXHRSend.apply(this,arguments);
};

// Domain verification
var currentHost=window.location.hostname.toLowerCase().replace(/^www\\./,'');
var allowedHost=ALLOWED_DOMAIN!=='*'?ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,''):null;
var domainMatches=!allowedHost||currentHost===allowedHost;

if(domainMatches){
  // Verify domain connection
  fetch('${verifyCallbackUrl}?domain='+encodeURIComponent(currentHost)+'${isPreview ? '&preview=1' : ''}',{
    method:'GET',mode:'cors',credentials:'omit'
  }).then(function(r){return r.json();}).then(function(d){
    if(d&&d.connected)console.log('[Consent SDK] Domain connected');
  }).catch(function(){});
  
  // Track page view
  fetch('${trackUrl}',{
    method:'POST',mode:'cors',credentials:'omit',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pagePath:location.pathname,pageTitle:document.title})
  }).catch(function(){});
}

// Create and show banner
function showBanner(){
  console.log('[Consent SDK] showBanner called');
  
  if(!isPreviewMode&&hasConsent()){
    console.log('[Consent SDK] Already has consent');
    return;
  }
  
  if(document.getElementById('cookie-banner')){
    if(isPreviewMode){
      document.getElementById('cookie-banner').remove();
    }else{
      console.log('[Consent SDK] Banner exists');
      return;
    }
  }
  
  if(!document.body){
    console.log('[Consent SDK] Waiting for body');
    setTimeout(showBanner,50);
    return;
  }
  
  console.log('[Consent SDK] Creating banner');
  
  var banner=document.createElement('div');
  banner.id='cookie-banner';
  
  // Position styles based on config
  var posStyle='';
  var pos='${position}';
  if(pos==='top')posStyle='top:0;bottom:auto;left:0;right:0;';
  else if(pos==='bottom-left')posStyle='bottom:20px;top:auto;left:20px;right:auto;';
  else if(pos==='bottom-right')posStyle='bottom:20px;top:auto;left:auto;right:20px;';
  else if(pos==='top-left')posStyle='top:20px;bottom:auto;left:20px;right:auto;';
  else if(pos==='top-right')posStyle='top:20px;bottom:auto;left:auto;right:20px;';
  else posStyle='bottom:0;top:auto;left:0;right:0;';
  
  // Build complete style from config
  var bannerCss='position:fixed;'+posStyle;
  bannerCss+='background:${bannerStyle.backgroundColor};';
  bannerCss+='color:${bannerStyle.textColor};';
  bannerCss+='padding:${bannerStyle.padding};';
  bannerCss+='z-index:999999;';
  bannerCss+='display:flex;';
  bannerCss+='align-items:center;';
  bannerCss+='justify-content:space-between;';
  bannerCss+='flex-wrap:wrap;';
  bannerCss+='gap:15px;';
  bannerCss+='font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  bannerCss+='font-size:${bannerStyle.fontSize};';
  bannerCss+='border-radius:${bannerStyle.borderRadius};';
  ${bannerStyle.border ? `bannerCss+='border:${bannerStyle.border.replace(/'/g, "\\'")};';` : ''}
  ${bannerStyle.boxShadow ? `bannerCss+='box-shadow:${bannerStyle.boxShadow.replace(/'/g, "\\'")};';` : ''}
  
  banner.style.cssText=bannerCss;
  
  // Create content
  var content=document.createElement('div');
  content.style.cssText='flex:1;min-width:250px;';
  content.innerHTML='<h3 style="margin:0 0 8px 0;font-size:18px;font-weight:600;">🍪 ${title}</h3><p style="margin:0;opacity:0.9;line-height:1.5;">${message}</p>';
  
  // Create buttons container
  var buttons=document.createElement('div');
  buttons.style.cssText='display:flex;gap:10px;flex-wrap:wrap;';
  
  // Accept button
  var acceptBtn=document.createElement('button');
  acceptBtn.textContent='${acceptText}';
  acceptBtn.style.cssText='background:${bannerStyle.buttonColor};color:${bannerStyle.buttonTextColor};border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:${bannerStyle.fontSize};transition:opacity 0.2s;';
  acceptBtn.onmouseover=function(){this.style.opacity='0.9';};
  acceptBtn.onmouseout=function(){this.style.opacity='1';};
  acceptBtn.onclick=function(){
    localStorage.setItem(CONSENT_KEY,'accepted');
    banner.remove();
    enableTrackers();
  };
  buttons.appendChild(acceptBtn);
  
  // Reject button
  ${showReject ? `
  var rejectBtn=document.createElement('button');
  rejectBtn.textContent='${rejectText}';
  rejectBtn.style.cssText='background:transparent;color:${bannerStyle.textColor};border:2px solid ${bannerStyle.textColor};padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:${bannerStyle.fontSize};transition:opacity 0.2s;';
  rejectBtn.onmouseover=function(){this.style.opacity='0.9';};
  rejectBtn.onmouseout=function(){this.style.opacity='1';};
  rejectBtn.onclick=function(){
    localStorage.setItem(CONSENT_KEY,'rejected');
    banner.remove();
  };
  buttons.appendChild(rejectBtn);
  ` : ''}
  
  banner.appendChild(content);
  banner.appendChild(buttons);
  document.body.appendChild(banner);
  
  console.log('[Consent SDK] Banner created and appended');
}

// Enable trackers after consent
function enableTrackers(){
  console.log('[Consent SDK] Enabling trackers');
  document.querySelectorAll('script[type="javascript/blocked"]').forEach(function(s){
    var n=document.createElement('script');
    n.src=s.src||s.getAttribute('data-blocked-src')||'';
    if(s.async)n.async=true;
    if(s.defer)n.defer=true;
    s.parentNode.replaceChild(n,s);
  });
  document.createElement=origCreate;
  window.fetch=origFetch;
  XMLHttpRequest.prototype.open=origXHROpen;
  XMLHttpRequest.prototype.send=origXHRSend;
  // Restore fbq if it was blocked
  if(window.fbq&&window.fbq.toString().indexOf('Blocked')>-1){
    delete window.fbq;
    if(window._fbq)delete window._fbq;
  }
}

// Show banner
var shouldShow=isPreviewMode||!hasConsent();
console.log('[Consent SDK] Should show banner:',shouldShow);

if(shouldShow){
  showBanner();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',showBanner);
  }
  setTimeout(showBanner,100);
  setTimeout(showBanner,500);
  setTimeout(showBanner,1000);
  window.addEventListener('load',function(){setTimeout(showBanner,100);});
  
  // Watchdog for preview mode
  if(isPreviewMode){
    var watchdog=setInterval(function(){
      var b=document.getElementById('cookie-banner');
      if(!b&&document.body)showBanner();
    },500);
    setTimeout(function(){clearInterval(watchdog);},30000);
  }
}

console.log('[Consent SDK] Initialized');
})();`;

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("Script generation error:", error);
    const fallbackScript = `(function(){
console.log('[Consent SDK] Using fallback');
var CONSENT_KEY='cookie_consent_fallback';
function showBanner(){
  if(localStorage.getItem(CONSENT_KEY)==='accepted')return;
  if(document.getElementById('cookie-banner'))return;
  if(!document.body){setTimeout(showBanner,100);return;}
  var b=document.createElement('div');
  b.id='cookie-banner';
  b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;font-family:sans-serif;';
  b.innerHTML='<div style="flex:1;"><h3 style="margin:0 0 8px 0;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;">This site uses tracking cookies.</p></div><div><button id="cb-accept" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button></div>';
  document.body.appendChild(b);
  document.getElementById('cb-accept').onclick=function(){localStorage.setItem(CONSENT_KEY,'accepted');b.remove();};
}
showBanner();
setTimeout(showBanner,500);
})();`;
    return new Response(fallbackScript, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
