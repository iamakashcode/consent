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

    // Extract banner configuration values with safe defaults
    const bgColor = effectiveConfig.backgroundColor || '#667eea';
    const textColor = effectiveConfig.textColor || '#ffffff';
    const buttonColor = effectiveConfig.buttonColor || '#ffffff';
    const buttonTextColor = effectiveConfig.buttonTextColor || '#667eea';
    const position = effectiveConfig.position || 'bottom';
    const title = (effectiveConfig.title || 'We use cookies').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const message = (effectiveConfig.message || effectiveConfig.description || 'This site uses tracking cookies. Accept to enable analytics.').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const acceptText = (effectiveConfig.acceptButtonText || effectiveConfig.acceptText || 'Accept').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const rejectText = (effectiveConfig.rejectButtonText || effectiveConfig.rejectText || 'Reject').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const showReject = effectiveConfig.showRejectButton !== false;

    const trackerDomains = [
      "google-analytics.com",
      "googletagmanager.com",
      "facebook.net",
      "connect.facebook.net",
      "doubleclick.net",
      "googleadservices.com",
      "googlesyndication.com",
      "hotjar.com",
      "clarity.ms"
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
  
  // Position styles
  var posStyle='bottom:0;left:0;right:0;';
  if('${position}'==='top')posStyle='top:0;left:0;right:0;';
  
  banner.style.cssText='position:fixed;'+posStyle+'background:${bgColor};color:${textColor};padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;';
  
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
  acceptBtn.style.cssText='background:${buttonColor};color:${buttonTextColor};border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;';
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
  rejectBtn.style.cssText='background:transparent;color:${textColor};border:2px solid ${textColor};padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;';
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
