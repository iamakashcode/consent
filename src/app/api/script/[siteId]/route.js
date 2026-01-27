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
    // CRITICAL: This must execute IMMEDIATELY before any other scripts
    const script = `(function(){
'use strict';
// Execute immediately - no delays
console.log('[Consent SDK] Starting - blocking trackers...');

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

// Store removed scripts for restoration
var blockedScripts=[];

// Block script - PHYSICALLY REMOVE from DOM to prevent execution
// CRITICAL: type="javascript/blocked" does NOT reliably prevent execution in modern browsers
function blockScript(s){
  if(!s)return;
  // Check if already blocked
  if(s.getAttribute('data-consent-blocked')==='true')return;
  
  var src=s.src||s.getAttribute('src')||'';
  var isInline=!src;
  var text=isInline?(s.textContent||s.innerHTML||''):'';
  
  // Store script info for restoration
  var scriptInfo={
    src:src,
    text:text,
    async:s.async,
    defer:s.defer,
    id:s.id,
    className:s.className,
    parent:s.parentNode,
    nextSibling:s.nextSibling,
    attributes:{}
  };
  
  // Copy all attributes
  for(var i=0;i<s.attributes.length;i++){
    var attr=s.attributes[i];
    if(attr.name!=='src'&&attr.name!=='type'){
      scriptInfo.attributes[attr.name]=attr.value;
    }
  }
  
  // Store blocked script info
  blockedScripts.push(scriptInfo);
  
  // PHYSICALLY REMOVE from DOM - this prevents execution
  if(s.parentNode){
    s.parentNode.removeChild(s);
    console.log('[Consent SDK] ✓ Removed tracker script:',src||'inline');
  }else{
    // If no parent, mark as blocked (shouldn't happen but safety check)
    s.setAttribute('data-consent-blocked','true');
    s.setAttribute('data-blocked-src',src);
    if(src)s.removeAttribute('src');
    s.type='javascript/blocked';
    console.log('[Consent SDK] ✓ Blocked script (no parent):',src||'inline');
  }
}

// Check if inline script contains tracker code
function hasTrackerCode(text){
  if(!text)return false;
  var lower=String(text).toLowerCase();
  var patterns=['gtag(','ga(','_gaq','fbq(','dataLayer','analytics','tracking','pixel','doubleclick','google-analytics','googletagmanager','facebook.net','fbevents'];
  for(var i=0;i<patterns.length;i++){
    if(lower.indexOf(patterns[i])>-1)return true;
  }
  return false;
}

// Block existing tracker scripts IMMEDIATELY
// CRITICAL: Must run before any scripts execute
if(!hasConsent()){
  console.log('[Consent SDK] Blocking existing trackers');
  var scripts=document.querySelectorAll('script[src]');
  for(var i=0;i<scripts.length;i++){
    var src=scripts[i].src||'';
    if(isTracker(src)){
      blockScript(scripts[i]);
    }
  }
  // Block inline tracker scripts
  var inlineScripts=document.querySelectorAll('script:not([src])');
  for(var i=0;i<inlineScripts.length;i++){
    var text=inlineScripts[i].textContent||inlineScripts[i].innerHTML||'';
    if(hasTrackerCode(text)){
      blockScript(inlineScripts[i]);
    }
  }
}

// Store original functions BEFORE any scripts can use them
var origCreate=document.createElement;
var origFetch=window.fetch;
var origAppendChild=Node.prototype.appendChild;
var origInsertBefore=Node.prototype.insertBefore;

// Intercept createElement - MUST happen before any scripts run
document.createElement=function(tag){
  var el=origCreate.call(document,tag);
  if(tag.toLowerCase()==='script'){
    var _src='';
    var _blocked=false;
    
    // Intercept src property
    Object.defineProperty(el,'src',{
      get:function(){return _src;},
      set:function(v){
        _src=v;
        // CRITICAL: Check consent LIVE
        if(v&&!hasConsent()&&isTracker(v)){
          _blocked=true;
          // Don't set src, will be blocked when added to DOM
          return;
        }
        if(v&&!_blocked)el.setAttribute('src',v);
      },
      configurable:true
    });
    
    // Intercept setAttribute for src
    var origSetAttribute=el.setAttribute;
    el.setAttribute=function(name,value){
      // CRITICAL: Check consent LIVE
      if(name==='src'&&!hasConsent()&&isTracker(value)){
        _blocked=true;
        return; // Don't set src if blocked
      }
      return origSetAttribute.call(this,name,value);
    };
    
    // Note: Inline scripts will be caught by appendChild/insertBefore/MutationObserver
    // No need to intercept textContent/innerHTML here
  }
  return el;
};

// Intercept fetch - block tracker requests
window.fetch=function(input,init){
  var url=typeof input==='string'?input:(input&&input.url?input.url:'');
  // CRITICAL: Check consent LIVE
  if(url&&!hasConsent()&&isTracker(url)){
    console.log('[Consent SDK] ✓ Blocked fetch:',url);
    return Promise.reject(new Error('Blocked by consent manager'));
  }
  return origFetch.apply(this,arguments);
};

// Intercept appendChild and insertBefore to catch scripts added to DOM
Node.prototype.appendChild=function(child){
  if(child&&child.tagName&&child.tagName.toLowerCase()==='script'){
    // CRITICAL: Check consent LIVE, not cached
    if(!hasConsent()){
      var src=child.src||child.getAttribute('src')||'';
      if(src&&isTracker(src)){
        blockScript(child);
        return child; // Return child but it's removed, prevents execution
      }
      var text=child.textContent||child.innerHTML||'';
      if(text&&hasTrackerCode(text)){
        blockScript(child);
        return child;
      }
    }
  }
  return origAppendChild.call(this,child);
};

Node.prototype.insertBefore=function(newNode,referenceNode){
  if(newNode&&newNode.tagName&&newNode.tagName.toLowerCase()==='script'){
    // CRITICAL: Check consent LIVE, not cached
    if(!hasConsent()){
      var src=newNode.src||newNode.getAttribute('src')||'';
      if(src&&isTracker(src)){
        blockScript(newNode);
        return newNode;
      }
      var text=newNode.textContent||newNode.innerHTML||'';
      if(text&&hasTrackerCode(text)){
        blockScript(newNode);
        return newNode;
      }
    }
  }
  return origInsertBefore.call(this,newNode,referenceNode);
};

// MutationObserver - CRITICAL for catching dynamically injected scripts
// Watches for scripts added AFTER page load (GTM, React, Next.js, etc.)
var observer=new MutationObserver(function(mutations){
  // CRITICAL: Check consent LIVE on every mutation
  if(hasConsent())return;
  
  mutations.forEach(function(mutation){
    mutation.addedNodes.forEach(function(node){
      if(node.nodeType===1&&node.tagName&&node.tagName.toLowerCase()==='script'){
        var src=node.src||node.getAttribute('src')||'';
        if(src&&isTracker(src)){
          blockScript(node);
        }else if(!src){
          var text=node.textContent||node.innerHTML||'';
          if(hasTrackerCode(text)){
            blockScript(node);
          }
        }
      }
      // Also check for scripts inside added nodes
      if(node.querySelectorAll){
        var scripts=node.querySelectorAll('script');
        for(var i=0;i<scripts.length;i++){
          var s=scripts[i];
          var src=s.src||s.getAttribute('src')||'';
          if(src&&isTracker(src)){
            blockScript(s);
          }else if(!src){
            var text=s.textContent||s.innerHTML||'';
            if(hasTrackerCode(text)){
              blockScript(s);
            }
          }
        }
      }
    });
  });
});

// Start observing - watch entire document for script additions
observer.observe(document.documentElement,{
  childList:true,
  subtree:true
});

console.log('[Consent SDK] MutationObserver initialized for dynamic script blocking');

// Store original tracking functions for restoration
var origFbq=window.fbq;
var origGtag=window.gtag;
var origGa=window.ga;
var origDataLayerPush=window.dataLayer&&window.dataLayer.push;
var origGaqPush=window._gaq&&window._gaq.push;

// Block tracking functions - check consent LIVE
function setupFunctionBlocking(){
  // CRITICAL: Always check consent LIVE, not cached
  if(hasConsent()){
    // Restore if consent granted
    if(origFbq)window.fbq=origFbq;
    if(origGtag)window.gtag=origGtag;
    if(origGa)window.ga=origGa;
    if(origDataLayerPush)window.dataLayer.push=origDataLayerPush;
    if(origGaqPush)window._gaq.push=origGaqPush;
    return;
  }
  
  // Block Meta Pixel fbq
  window.fbq=function(){
    console.log('[Consent SDK] ✓ Blocked fbq() call');
    return false;
  };
  window._fbq=window.fbq;
  
  // Block Google Analytics gtag
  window.gtag=function(){
    console.log('[Consent SDK] ✓ Blocked gtag() call');
    return false;
  };
  
  // Block dataLayer
  if(!window.dataLayer)window.dataLayer=[];
  window.dataLayer.push=function(){
    console.log('[Consent SDK] ✓ Blocked dataLayer.push()');
    return 0;
  };
  
  // Block Google Analytics ga function
  window.ga=function(){
    console.log('[Consent SDK] ✓ Blocked ga() call');
    return false;
  };
  
  // Block _gaq
  if(!window._gaq)window._gaq=[];
  window._gaq.push=function(){
    console.log('[Consent SDK] ✓ Blocked _gaq.push()');
    return 0;
  };
}

// Setup blocking immediately
setupFunctionBlocking();

// Re-check periodically (in case consent changes)
setInterval(setupFunctionBlocking,1000);

// Intercept XMLHttpRequest - block tracker requests
var origXHROpen=XMLHttpRequest.prototype.open;
var origXHRSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url){
  // CRITICAL: Check consent LIVE
  if(url&&!hasConsent()&&isTracker(url)){
    console.log('[Consent SDK] ✓ Blocked XHR:',url);
    this._blocked=true;
    this._blockedUrl=url;
    return;
  }
  this._blocked=false;
  return origXHROpen.apply(this,arguments);
};
XMLHttpRequest.prototype.send=function(data){
  // CRITICAL: Re-check consent on send
  if(this._blocked||(!hasConsent()&&this._blockedUrl&&isTracker(this._blockedUrl))){
    console.log('[Consent SDK] ✓ Blocked XHR send:',this._blockedUrl);
    return;
  }
  return origXHRSend.apply(this,arguments);
};

// Block navigator.sendBeacon - used by modern trackers
var origSendBeacon=navigator.sendBeacon;
navigator.sendBeacon=function(url,data){
  // CRITICAL: Check consent LIVE
  if(!hasConsent()&&isTracker(url)){
    console.log('[Consent SDK] ✓ Blocked sendBeacon:',url);
    return false;
  }
  return origSendBeacon.apply(this,arguments);
};

// Block Image pixel beacons - common tracking method
var origImage=window.Image;
window.Image=function(width,height){
  var img=origImage(width,height);
  var origSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(origSrc){
    Object.defineProperty(img,'src',{
      get:function(){return this.getAttribute('src')||'';},
      set:function(url){
        // CRITICAL: Check consent LIVE
        if(!hasConsent()&&isTracker(url)){
          console.log('[Consent SDK] ✓ Blocked Image pixel:',url);
          return;
        }
        this.setAttribute('src',url);
      },
      configurable:true
    });
  }
  return img;
};

console.log('[Consent SDK] Tracker blocking initialized');

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
  
  // Restore blocked scripts from our stored array
  // CRITICAL: Only restore scripts that were actually removed
  blockedScripts.forEach(function(scriptInfo){
    if(!scriptInfo.parent)return; // Skip if no parent (can't restore)
    
    var newScript=document.createElement('script');
    if(scriptInfo.src){
      newScript.src=scriptInfo.src;
    }else if(scriptInfo.text){
      newScript.textContent=scriptInfo.text;
    }
    
    if(scriptInfo.async)newScript.async=true;
    if(scriptInfo.defer)newScript.defer=true;
    if(scriptInfo.id)newScript.id=scriptInfo.id;
    if(scriptInfo.className)newScript.className=scriptInfo.className;
    
    // Restore attributes
    for(var attr in scriptInfo.attributes){
      newScript.setAttribute(attr,scriptInfo.attributes[attr]);
    }
    
    // Insert at original position
    if(scriptInfo.nextSibling){
      scriptInfo.parent.insertBefore(newScript,scriptInfo.nextSibling);
    }else{
      scriptInfo.parent.appendChild(newScript);
    }
    
    console.log('[Consent SDK] Restored script:',scriptInfo.src||'inline');
  });
  
  // Clear blocked scripts array
  blockedScripts=[];
  
  // Restore original functions
  document.createElement=origCreate;
  window.fetch=origFetch;
  Node.prototype.appendChild=origAppendChild;
  Node.prototype.insertBefore=origInsertBefore;
  XMLHttpRequest.prototype.open=origXHROpen;
  XMLHttpRequest.prototype.send=origXHRSend;
  navigator.sendBeacon=origSendBeacon;
  window.Image=origImage;
  
  // Stop MutationObserver
  if(observer)observer.disconnect();
  
  // Restore tracking functions (setupFunctionBlocking will handle this)
  setupFunctionBlocking();
  
  console.log('[Consent SDK] All trackers enabled');
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
