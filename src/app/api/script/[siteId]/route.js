import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

// Generate minimal inline blocker (runs first, blocks immediately)
function generateInlineBlocker(siteId, allowedDomain, isPreview) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';
// ============================================================
// MINIMAL INLINE BLOCKER - RUNS FIRST, BLOCKS IMMEDIATELY
// Paste this code in <head> BEFORE any other scripts
// ============================================================

// Global blocker API - exposed to main script
window._consentBlocker=window._consentBlocker||{};
var blocker=window._consentBlocker;
blocker.CONSENT_KEY='${CONSENT_KEY}';
blocker.blockedNodes=[];
blocker.origFbq=window.fbq;
blocker.origGtag=window.gtag;
blocker.origGa=window.ga;
blocker.origDataLayerPush=window.dataLayer&&window.dataLayer.push;
blocker.origGaqPush=window._gaq&&window._gaq.push;
blocker.origAnalyticsTrack=window.analytics&&window.analytics.track;
blocker.origCreateElement=document.createElement;
blocker.origAppendChild=Node.prototype.appendChild;
blocker.origInsertBefore=Node.prototype.insertBefore;
blocker.origFetch=window.fetch;
blocker.origXHROpen=XMLHttpRequest.prototype.open;
blocker.origXHRSend=XMLHttpRequest.prototype.send;
blocker.origSendBeacon=navigator.sendBeacon;
blocker.origImage=window.Image;

// Check consent (LIVE - never cached)
function hasConsent(){
  return localStorage.getItem(blocker.CONSENT_KEY)==='accepted';
}

// Check if essential
function isEssential(node){
  return node&&node.getAttribute&&node.getAttribute('data-consent')==='essential';
}

// Universal tracker detection
var TRACKER_DOMAINS=['google','facebook','meta','doubleclick','tiktok','twitter','linkedin','hotjar','clarity','segment','mixpanel','amplitude','ads','tagmanager','analytics','tracking','pixel','beacon','collect','metrics','insight','telemetry','monitor','gtm','ga','gtag','fbevents'];
function isTracker(url,text,node){
  if(isEssential(node))return false;
  var str=((url||'')+(text||'')).toLowerCase();
  if(!str)return false;
  if(/tracking|analytics|pixel|collect|beacon|tag|ads|metrics|insight|telemetry|event|monitor/i.test(str))return true;
  for(var i=0;i<TRACKER_DOMAINS.length;i++)if(str.indexOf(TRACKER_DOMAINS[i])>-1)return true;
  var patterns=['fbq(','_fbq','gtag(','ga(','_gaq','dataLayer','analytics.track','analytics.page','analytics.identify','mixpanel.track','amplitude','navigator.sendBeacon','new Image().src','_hsq','hj(','clarity('];
  for(var j=0;j<patterns.length;j++)if(str.indexOf(patterns[j])>-1)return true;
  if(url&&/[\\/]track|[\\/]event|[\\/]collect|[\\/]pixel|[\\/]beacon|[\\/]analytics|[\\/]metrics/i.test(url))return true;
  return false;
}

// Backup node
function backupNode(node){
  if(!node)return null;
  return{
    tagName:node.tagName?node.tagName.toLowerCase():'',
    src:node.src||node.getAttribute('src')||'',
    text:node.textContent||node.innerHTML||'',
    parent:node.parentNode,
    nextSibling:node.nextSibling,
    attributes:{},
    isInline:!(node.src||node.getAttribute('src')),
    node:node
  };
}

// Stub all tracking functions IMMEDIATELY
window.fbq=function(){if(hasConsent()&&blocker.origFbq)return blocker.origFbq.apply(this,arguments);};
window._fbq=window.fbq;
window.fbq.queue=[];window.fbq.loaded=true;window.fbq.version='2.0';window.fbq.push=window.fbq;window.fbq.callMethod=function(){};
window.gtag=function(){if(hasConsent()&&blocker.origGtag)return blocker.origGtag.apply(this,arguments);};
if(!window.dataLayer)window.dataLayer=[];
window.dataLayer.push=function(){if(hasConsent()&&blocker.origDataLayerPush)return blocker.origDataLayerPush.apply(window.dataLayer,arguments);return 0;};
window.ga=function(){if(hasConsent()&&blocker.origGa)return blocker.origGa.apply(this,arguments);};
window.ga.l=Date.now();window.ga.q=[];
if(!window._gaq)window._gaq=[];
window._gaq.push=function(){if(hasConsent()&&blocker.origGaqPush)return blocker.origGaqPush.apply(window._gaq,arguments);return 0;};
if(!window.analytics)window.analytics={};
window.analytics.track=function(){if(hasConsent()&&blocker.origAnalyticsTrack)return blocker.origAnalyticsTrack.apply(this,arguments);};
window.analytics.page=function(){};window.analytics.identify=function(){};window.analytics.alias=function(){};
window.mixpanel=window.mixpanel||{};window.mixpanel.track=function(){};window.mixpanel.identify=function(){};
window.amplitude=window.amplitude||{};window.amplitude.getInstance=function(){return{logEvent:function(){}};};
window._hsq=window._hsq||[];window._hsq.push=function(){};
window.hj=window.hj||function(){};
window.clarity=window.clarity||function(){};

// Override createElement
document.createElement=function(tagName,options){
  var el=blocker.origCreateElement.call(this,tagName,options);
  var tag=tagName.toLowerCase();
  if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()){
    var proto=tag==='script'?HTMLScriptElement.prototype:(tag==='iframe'?HTMLIFrameElement.prototype:HTMLImageElement.prototype);
    var origSrc=Object.getOwnPropertyDescriptor(proto,'src');
    if(origSrc){
      Object.defineProperty(el,'src',{
        get:function(){return this.getAttribute('src')||'';},
        set:function(url){
          if(url&&isTracker(url,'',this)){
            this.setAttribute('data-consent-blocked','true');
            this.setAttribute('data-blocked-src',url);
            if(tag==='script')this.type='javascript/blocked';
            return;
          }
          this.setAttribute('src',url);
        },
        configurable:true,enumerable:true
      });
    }
    if(tag==='script'){
      var origType=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'type');
      if(origType){
        Object.defineProperty(el,'type',{
          get:function(){return this.getAttribute('type')||'text/javascript';},
          set:function(type){
            var src=this.src||this.getAttribute('src')||'';
            var text=this.textContent||this.innerHTML||'';
            if(isTracker(src,text,this)){
              this.setAttribute('data-consent-blocked','true');
              if(src)this.setAttribute('data-blocked-src',src);
              this.setAttribute('type','javascript/blocked');
              return;
            }
            this.setAttribute('type',type||'text/javascript');
          },
          configurable:true,enumerable:true
        });
      }
    }
  }
  return el;
};

// Override appendChild/insertBefore
Node.prototype.appendChild=function(child){
  if(child&&child.tagName){
    var tag=child.tagName.toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()){
      var src=child.src||child.getAttribute('src')||'';
      var text=tag==='script'?(child.textContent||child.innerHTML||''):'';
      if(isTracker(src,text,child)){
        var backup=backupNode(child);
        if(backup)blocker.blockedNodes.push(backup);
        child.setAttribute('data-consent-blocked','true');
        if(src)child.setAttribute('data-blocked-src',src);
        if(tag==='script')child.type='javascript/blocked';
        return child;
      }
    }
  }
  return blocker.origAppendChild.call(this,child);
};

Node.prototype.insertBefore=function(newNode,ref){
  if(newNode&&newNode.tagName){
    var tag=newNode.tagName.toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()){
      var src=newNode.src||newNode.getAttribute('src')||'';
      var text=tag==='script'?(newNode.textContent||newNode.innerHTML||''):'';
      if(isTracker(src,text,newNode)){
        var backup=backupNode(newNode);
        if(backup)blocker.blockedNodes.push(backup);
        newNode.setAttribute('data-consent-blocked','true');
        if(src)newNode.setAttribute('data-blocked-src',src);
        if(tag==='script')newNode.type='javascript/blocked';
        return newNode;
      }
    }
  }
  return blocker.origInsertBefore.call(this,newNode,ref);
};

// Block existing scripts in DOM
function blockExisting(){
  if(hasConsent())return;
  var scripts=document.querySelectorAll('script[src],script:not([src])');
  for(var i=0;i<scripts.length;i++){
    var s=scripts[i];
    if(s.getAttribute('data-consent-blocked')==='true')continue;
    var src=s.src||s.getAttribute('src')||'';
    var text=s.textContent||s.innerHTML||'';
    if(isTracker(src,text,s)){
      var backup=backupNode(s);
      if(backup)blocker.blockedNodes.push(backup);
      if(s.parentNode)s.parentNode.removeChild(s);
      else{s.setAttribute('data-consent-blocked','true');s.type='javascript/blocked';}
    }
  }
  var iframes=document.querySelectorAll('iframe[src]');
  for(var i=0;i<iframes.length;i++){
    var ifr=iframes[i];
    if(ifr.getAttribute('data-consent-blocked')==='true')continue;
    var src=ifr.src||ifr.getAttribute('src')||'';
    if(isTracker(src,'',ifr)){
      var backup=backupNode(ifr);
      if(backup)blocker.blockedNodes.push(backup);
      if(ifr.parentNode)ifr.parentNode.removeChild(ifr);
    }
  }
  var imgs=document.querySelectorAll('img[src]');
  for(var i=0;i<imgs.length;i++){
    var img=imgs[i];
    if(img.getAttribute('data-consent-blocked')==='true')continue;
    var src=img.src||img.getAttribute('src')||'';
    if(isTracker(src,'',img)){
      var backup=backupNode(img);
      if(backup)blocker.blockedNodes.push(backup);
      if(img.parentNode)img.parentNode.removeChild(img);
    }
  }
}

// Network interception
window.fetch=function(input,init){
  if(hasConsent())return blocker.origFetch.apply(this,arguments);
  var url=typeof input==='string'?input:(input&&input.url?input.url:'');
  if(url&&isTracker(url,'',null))return Promise.reject(new Error('Blocked'));
  return blocker.origFetch.apply(this,arguments);
};

XMLHttpRequest.prototype.open=function(method,url){
  if(hasConsent()){this._blocked=false;return blocker.origXHROpen.apply(this,arguments);}
  if(url&&isTracker(url,'',null)){this._blocked=true;this._blockedUrl=url;return;}
  this._blocked=false;this._blockedUrl=url;
  return blocker.origXHROpen.apply(this,arguments);
};

XMLHttpRequest.prototype.send=function(data){
  if(this._blocked||(!hasConsent()&&this._blockedUrl&&isTracker(this._blockedUrl,'',null)))return;
  return blocker.origXHRSend.apply(this,arguments);
};

navigator.sendBeacon=function(url,data){
  if(hasConsent())return blocker.origSendBeacon.apply(this,arguments);
  if(url&&isTracker(url,'',null))return false;
  return blocker.origSendBeacon.apply(this,arguments);
};

window.Image=function(){
  var img=new blocker.origImage();
  var origSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(origSrc){
    Object.defineProperty(img,'src',{
      get:function(){return this.getAttribute('src')||'';},
      set:function(url){
        if(!hasConsent()&&isTracker(url,'',this))return;
        this.setAttribute('src',url);
      },
      configurable:true
    });
  }
  return img;
};

// MutationObserver
blocker.observer=new MutationObserver(function(mutations){
  if(hasConsent())return;
  mutations.forEach(function(m){
    m.addedNodes.forEach(function(node){
      if(node.nodeType!==1||!node.tagName)return;
      var tag=node.tagName.toLowerCase();
      if(tag==='script'||tag==='iframe'||tag==='img'){
        var src=node.src||node.getAttribute('src')||'';
        var text=tag==='script'?(node.textContent||node.innerHTML||''):'';
        if(isTracker(src,text,node)){
          var backup=backupNode(node);
          if(backup)blocker.blockedNodes.push(backup);
          if(node.parentNode)node.parentNode.removeChild(node);
          else{node.setAttribute('data-consent-blocked','true');if(tag==='script')node.type='javascript/blocked';}
        }
      }
    });
  });
});

blocker.observer.observe(document.documentElement,{childList:true,subtree:true});

// Execute blocking immediately
blockExisting();
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',blockExisting);
}
window.addEventListener('load',blockExisting);

// Expose enable function to main script
blocker.enable=function(){
  if(hasConsent()){
    blocker.blockedNodes.forEach(function(backup){
      if(!backup||!backup.parent||backup.isInline||!backup.src)return;
      var el=document.createElement(backup.tagName);
      el.src=backup.src;
      for(var attr in backup.attributes)el.setAttribute(attr,backup.attributes[attr]);
      if(backup.nextSibling)backup.parent.insertBefore(el,backup.nextSibling);
      else backup.parent.appendChild(el);
    });
    blocker.blockedNodes=[];
    document.createElement=blocker.origCreateElement;
    Node.prototype.appendChild=blocker.origAppendChild;
    Node.prototype.insertBefore=blocker.origInsertBefore;
    window.fetch=blocker.origFetch;
    XMLHttpRequest.prototype.open=blocker.origXHROpen;
    XMLHttpRequest.prototype.send=blocker.origXHRSend;
    navigator.sendBeacon=blocker.origSendBeacon;
    window.Image=blocker.origImage;
    if(blocker.observer)blocker.observer.disconnect();
    if(blocker.origFbq){window.fbq=blocker.origFbq;window._fbq=blocker.origFbq;}
    else{delete window.fbq;delete window._fbq;}
    if(blocker.origGtag)window.gtag=blocker.origGtag;else delete window.gtag;
    if(blocker.origGa)window.ga=blocker.origGa;else delete window.ga;
    if(blocker.origDataLayerPush)window.dataLayer.push=blocker.origDataLayerPush;
    else if(window.dataLayer)window.dataLayer.push=Array.prototype.push;
    if(blocker.origGaqPush)window._gaq.push=blocker.origGaqPush;
    else if(window._gaq)window._gaq.push=Array.prototype.push;
    if(blocker.origAnalyticsTrack&&window.analytics)window.analytics.track=blocker.origAnalyticsTrack;
  }
};

blocker.ready=true;
console.log('[Consent Blocker] Initialized');
})();`;
}

// Generate main script (banner, consent management)
function generateMainScript(siteId, allowedDomain, isPreview, config, bannerStyle, position, title, message, acceptText, rejectText, showReject, verifyCallbackUrl, trackUrl) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';
// ============================================================
// MAIN CONSENT SCRIPT - Banner & Consent Management
// ============================================================

var SITE_ID='${siteId}';
var CONSENT_KEY='${CONSENT_KEY}';
var isPreviewMode=${isPreview ? 'true' : 'false'};
var ALLOWED_DOMAIN='${isPreview ? '*' : allowedDomain}';

// Wait for blocker to be ready
function waitForBlocker(callback){
  if(window._consentBlocker&&window._consentBlocker.ready){
    callback();
  }else{
    setTimeout(function(){waitForBlocker(callback);},10);
  }
}

// Check consent
function hasConsent(){
  return localStorage.getItem(CONSENT_KEY)==='accepted';
}

// Domain validation
var currentHost=window.location.hostname.toLowerCase().replace(/^www\\./,'');
var allowedHost=ALLOWED_DOMAIN!=='*'?ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,''):null;
var domainMatches=!allowedHost||currentHost===allowedHost;

if(!domainMatches){
  console.warn('[Consent SDK] Domain mismatch');
  return;
}

// Clear consent in preview mode
if(isPreviewMode){
  localStorage.removeItem(CONSENT_KEY);
  var existing=document.getElementById('cookie-banner');
  if(existing)existing.remove();
}

// Enable trackers (uses blocker API)
function enableTrackers(){
  if(window._consentBlocker&&window._consentBlocker.enable){
    window._consentBlocker.enable();
    console.log('[Consent SDK] Trackers enabled');
  }
}

// Show banner
function showBanner(){
  if(!isPreviewMode&&hasConsent())return;
  if(document.getElementById('cookie-banner'))return;
  if(!document.body){setTimeout(showBanner,50);return;}
  
  var banner=document.createElement('div');
  banner.id='cookie-banner';
  
  var pos='${position}';
  var posStyle='';
  if(pos==='top')posStyle='top:0;bottom:auto;left:0;right:0;';
  else if(pos==='bottom-left')posStyle='bottom:20px;top:auto;left:20px;right:auto;';
  else if(pos==='bottom-right')posStyle='bottom:20px;top:auto;left:auto;right:20px;';
  else if(pos==='top-left')posStyle='top:20px;bottom:auto;left:20px;right:auto;';
  else if(pos==='top-right')posStyle='top:20px;bottom:auto;left:auto;right:20px;';
  else posStyle='bottom:0;top:auto;left:0;right:0;';
  
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
  
  var content=document.createElement('div');
  content.style.cssText='flex:1;min-width:250px;';
  content.innerHTML='<h3 style="margin:0 0 8px 0;font-size:18px;font-weight:600;">🍪 ${title}</h3><p style="margin:0;opacity:0.9;line-height:1.5;">${message}</p>';
  
  var buttons=document.createElement('div');
  buttons.style.cssText='display:flex;gap:10px;flex-wrap:wrap;';
  
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
}

// Domain verification & page tracking
if(domainMatches){
  fetch('${verifyCallbackUrl}?domain='+encodeURIComponent(currentHost)+'${isPreview ? '&preview=1' : ''}',{
    method:'GET',mode:'cors',credentials:'omit'
  }).then(function(r){return r.json();}).then(function(d){
    if(d&&d.connected)console.log('[Consent SDK] Domain connected');
  }).catch(function(){});
  
  fetch('${trackUrl}',{
    method:'POST',mode:'cors',credentials:'omit',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pagePath:location.pathname,pageTitle:document.title})
  }).catch(function(){});
}

// Initialize
waitForBlocker(function(){
  var shouldShow=isPreviewMode||!hasConsent();
  if(shouldShow){
    showBanner();
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',showBanner);
    }
    setTimeout(showBanner,100);
    setTimeout(showBanner,500);
    setTimeout(showBanner,1000);
    window.addEventListener('load',function(){setTimeout(showBanner,100);});
    
    if(isPreviewMode){
      var watchdog=setInterval(function(){
        var b=document.getElementById('cookie-banner');
        if(!b&&document.body)showBanner();
      },500);
      setTimeout(function(){clearInterval(watchdog);},30000);
    }
  }
  console.log('[Consent SDK] Initialized');
});
})();`;
}

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

    // Generate split architecture: inline blocker + main script
    const inlineBlocker = generateInlineBlocker(finalSiteId, allowedDomain || '*', isPreview);
    const mainScript = generateMainScript(finalSiteId, allowedDomain || '*', isPreview, effectiveConfig, bannerStyle, position, title, message, acceptText, rejectText, showReject, verifyCallbackUrl, trackUrl);
    
    // Check if user wants just the inline blocker code
    const returnInlineBlocker = searchParams.get("inline") === "1";
    
    if (returnInlineBlocker) {
      // Return just the inline blocker code (for pasting in <head>)
      return new Response(inlineBlocker, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
    // Return combined script (inline blocker + main script)
    // This ensures it works even if inline blocker wasn't loaded separately
    // The blocker runs first, then the main script initializes
    const script = inlineBlocker + "\n\n" + mainScript;

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
