import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

// Generate AGGRESSIVE pre-execution blocker
function generateInlineBlocker(siteId, allowedDomain, isPreview) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';
/* ======================================================
   CONFIG
====================================================== */

var SITE_ID='${siteId}';
var CONSENT_KEY='${CONSENT_KEY}';
var DEBUG=true;

var TRACKER_PATTERNS=[
  // Google
  'google-analytics','googletagmanager','gtag/js','gtag','analytics.js','ga.js','/gtm.js','google.com/pagead','googleadservices','googlesyndication','doubleclick',
  // Meta/Facebook
  'facebook.net','facebook.com/tr','fbevents.js','connect.facebook',
  // Microsoft
  'clarity.ms','bing.com/bat',
  // Other trackers
  'hotjar','static.hotjar','mixpanel','amplitude','segment','segment.io','heapanalytics','fullstory','mouseflow','crazyegg','lucky-orange','inspectlet','logrocket',
  // Twitter/X
  'analytics.twitter','static.ads-twitter','t.co/i/adsct',
  // LinkedIn
  'snap.licdn','linkedin.com/px','ads.linkedin',
  // TikTok
  'analytics.tiktok','tiktok.com/i18n',
  // Pinterest
  'pintrk','ct.pinterest',
  // Snapchat
  'sc-static.net','tr.snapchat',
  // Generic patterns
  '/pixel','/beacon','/collect','/track','/analytics','/event','/conversion'
];

var TRACKER_CODE_PATTERNS=[
  'fbq(','fbq.push','_fbq','fbq.init','fbq.track','fbq.trackcustom','fbq.tracksingle','fbq.set','fbq.callmethod',
  'gtag(','gtag.push','ga(','ga.push','_gaq.push','dataLayer.push','dataLayer.push(',
  'analytics.track','analytics.page','analytics.identify','analytics.alias',
  'mixpanel.track','mixpanel.identify','amplitude.','amplitude.getInstance',
  'hj(','hj.track','clarity(','clarity.identify',
  'pintrk(','pintrk.track','twq(','twq.track','snaptr(','snaptr.track','ttq.','ttq.track','ttq.page',
  '_linkedin','linkedininsight','_linkedin_data_partner_ids'
];

/* ======================================================
   HELPERS
====================================================== */

function log(msg){if(DEBUG)console.log('[ConsentBlock]',msg);}

function hasConsent(){
  try{
    return localStorage.getItem(CONSENT_KEY)==='accepted';
  }catch(e){
    return false;
  }
}

function isTrackerUrl(url){
  if(!url)return false;
  var u=url.toLowerCase();
  for(var i=0;i<TRACKER_PATTERNS.length;i++){
    if(u.indexOf(TRACKER_PATTERNS[i])!==-1)return true;
  }
  return false;
}

function isTrackerCode(code){
  if(!code)return false;
  var c=code.toLowerCase();
  for(var i=0;i<TRACKER_CODE_PATTERNS.length;i++){
    if(c.indexOf(TRACKER_CODE_PATTERNS[i])!==-1)return true;
  }
  return false;
}

function isTracker(url,code){
  return isTrackerUrl(url)||isTrackerCode(code);
}

function isFirstParty(url){
  try{
    if(!url)return false;
    var u=new URL(url,location.href);
    return u.hostname===location.hostname||u.hostname.replace(/^www\\./,'')===location.hostname.replace(/^www\\./,'');
  }catch(e){
    return false;
  }
}

function isEssential(el){
  if(!el||!el.getAttribute)return false;
  return el.getAttribute('data-consent')==='essential'||el.getAttribute('data-cookieconsent')==='necessary';
}

/* ======================================================
   LAYER 1 — PRE-EXECUTION BLOCKER (SAFE)
====================================================== */

var B=window._cb=window._cb||{};
B.key=CONSENT_KEY;
B.blocked=[];

// Store originals
var _setAttribute=Element.prototype.setAttribute;
var _createElement=document.createElement;
var _appendChild=Node.prototype.appendChild;
var _insertBefore=Node.prototype.insertBefore;
var _fetch=window.fetch;
var _XHRopen=XMLHttpRequest.prototype.open;
var _XHRsend=XMLHttpRequest.prototype.send;
var _sendBeacon=navigator.sendBeacon;
var _Image=window.Image;

// Global stubs (safe) - Stub IMMEDIATELY
var noop=function(){log('tracker blocked');};
window.fbq=window.fbq||noop;
window._fbq=window.fbq;
window.fbq.queue=[];window.fbq.loaded=true;window.fbq.version='2.0';
window.fbq.push=window.fbq;window.fbq.callMethod=noop;
window.fbq.track=noop;window.fbq.trackCustom=noop;window.fbq.trackSingle=noop;
window.fbq.init=noop;window.fbq.set=noop;window.fbq.delete=noop;

window.gtag=window.gtag||noop;
window.ga=window.ga||noop;
window.dataLayer=window.dataLayer||[];
window.dataLayer.push=function(){log('dataLayer.push() blocked');return 0;};
window._gaq=window._gaq||[];
window._gaq.push=function(){log('_gaq.push() blocked');return 0;};

window.analytics=window.analytics||{track:noop,page:noop,identify:noop,alias:noop,ready:noop,reset:noop};
window.mixpanel=window.mixpanel||{track:noop,identify:noop,people:{set:noop}};
window.amplitude=window.amplitude||{getInstance:function(){return{logEvent:noop,setUserId:noop,init:noop}};};
window.hj=window.hj||noop;
window.clarity=window.clarity||noop;
window._hsq=window._hsq||[];
window._hsq.push=noop;
window.twq=window.twq||noop;
window.pintrk=window.pintrk||noop;
window.ttq=window.ttq||{track:noop,page:noop,identify:noop};
window.snaptr=window.snaptr||noop;

log('Global stubs initialized');

// Block <script src=""> via setAttribute
Element.prototype.setAttribute=function(name,value){
  if(!hasConsent()&&this.tagName==='SCRIPT'&&name==='src'&&isTrackerUrl(value)&&!isEssential(this)){
    log('BLOCKED setAttribute src: '+value);
    this.type='javascript/blocked';
    this.dataset.blockedSrc=value;
    this.dataset.consentBlocked='true';
    B.blocked.push({tag:'script',src:value,parent:this.parentNode,next:this.nextSibling});
    return;
  }
  return _setAttribute.call(this,name,value);
};

// Block dynamically created scripts
document.createElement=function(tag,opts){
  var el=_createElement.call(document,tag,opts);
  var t=tag.toLowerCase();
  
  if(t==='script'&&!hasConsent()){
    // Override src setter
    Object.defineProperty(el,'src',{
      set:function(url){
        if(!hasConsent()&&isTrackerUrl(url)&&!isEssential(el)){
          log('BLOCKED createElement script src: '+url);
          el.type='javascript/blocked';
          el.dataset.blockedSrc=url;
          el.dataset.consentBlocked='true';
          return;
        }
        _setAttribute.call(el,'src',url);
      },
      get:function(){return el.getAttribute('src')||'';},
      configurable:true
    });
    
    // Override textContent for inline scripts
    var origTextContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
    if(origTextContent){
      Object.defineProperty(el,'textContent',{
        set:function(code){
          if(!hasConsent()&&isTrackerCode(code)&&!isEssential(el)){
            log('BLOCKED inline script');
            el.type='javascript/blocked';
            el.dataset.consentBlocked='true';
            return;
          }
          if(origTextContent.set)origTextContent.set.call(this,code);
        },
        get:function(){return origTextContent.get?origTextContent.get.call(this):'';},
        configurable:true
      });
    }
  }
  
  return el;
};

// Block appendChild
Node.prototype.appendChild=function(child){
  if(child&&child.nodeType===1){
    var tag=(child.tagName||'').toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(child)){
      var src=child.getAttribute('src')||child.src||child.dataset.blockedSrc||'';
      var code=tag==='script'?(child.textContent||child.text||child.innerHTML||''):'';
      
      if(isTracker(src,code)){
        log('BLOCKED appendChild: '+(src||'inline '+tag));
        B.blocked.push({tag:tag,src:src,code:code,parent:this,next:null});
        child.dataset.consentBlocked='true';
        if(tag==='script'){
          child.type='javascript/blocked';
          try{child.src='';child.textContent='';child.innerHTML='';}catch(e){}
        }
        return child; // Return but don't append
      }
    }
  }
  return _appendChild.call(this,child);
};

// Block insertBefore
Node.prototype.insertBefore=function(newNode,refNode){
  if(newNode&&newNode.nodeType===1){
    var tag=(newNode.tagName||'').toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(newNode)){
      var src=newNode.getAttribute('src')||newNode.src||newNode.dataset.blockedSrc||'';
      var code=tag==='script'?(newNode.textContent||newNode.text||newNode.innerHTML||''):'';
      
      if(isTracker(src,code)){
        log('BLOCKED insertBefore: '+(src||'inline '+tag));
        B.blocked.push({tag:tag,src:src,code:code,parent:this,next:refNode});
        newNode.dataset.consentBlocked='true';
        if(tag==='script'){
          newNode.type='javascript/blocked';
          try{newNode.src='';newNode.textContent='';newNode.innerHTML='';}catch(e){}
        }
        return newNode;
      }
    }
  }
  return _insertBefore.call(this,newNode,refNode);
};

// Enable function
window.__enableConsentTrackers=function(){
  log('Enabling trackers...');
  
  // Restore originals
  Element.prototype.setAttribute=_setAttribute;
  document.createElement=_createElement;
  Node.prototype.appendChild=_appendChild;
  Node.prototype.insertBefore=_insertBefore;
  window.fetch=_fetch;
  XMLHttpRequest.prototype.open=_XHRopen;
  XMLHttpRequest.prototype.send=_XHRsend;
  navigator.sendBeacon=_sendBeacon;
  window.Image=_Image;
  
  // Remove stubs
  delete window.fbq;delete window._fbq;
  delete window.gtag;delete window.ga;
  delete window.analytics;delete window.mixpanel;
  delete window.amplitude;delete window.hj;delete window.clarity;
  delete window._hsq;delete window.twq;delete window.pintrk;
  delete window.ttq;delete window.snaptr;
  
  // Restore blocked external scripts
  document.querySelectorAll('script[data-blocked-src]').forEach(function(s){
    if(!s.dataset.blockedSrc)return;
    var n=document.createElement('script');
    n.src=s.dataset.blockedSrc;
    n.setAttribute('data-consent-restored','true');
    try{
      if(s.nextSibling&&s.parentNode.contains(s.nextSibling)){
        s.parentNode.insertBefore(n,s.nextSibling);
      }else{
        s.parentNode.appendChild(n);
      }
      log('Restored: '+s.dataset.blockedSrc);
    }catch(e){
      document.head.appendChild(n);
    }
  });
  
  // Also restore from B.blocked
  for(var i=0;i<B.blocked.length;i++){
    var b=B.blocked[i];
    if(!b.src||!b.parent)continue;
    var el=document.createElement(b.tag);
    el.src=b.src;
    el.setAttribute('data-consent-restored','true');
    try{
      if(b.next&&b.parent.contains(b.next)){
        b.parent.insertBefore(el,b.next);
      }else{
        b.parent.appendChild(el);
      }
    }catch(e){
      document.head.appendChild(el);
    }
  }
  
  B.blocked=[];
  log('Trackers enabled');
};

// Block existing scripts immediately
function blockExistingTrackers(){
  if(hasConsent())return;
  
  var scripts=document.getElementsByTagName('script');
  var toRemove=[];
  for(var i=0;i<scripts.length;i++){
    var s=scripts[i];
    if(s.dataset.consentBlocked==='true')continue;
    if(isEssential(s))continue;
    
    var src=s.getAttribute('src')||s.src||'';
    var code=s.textContent||s.text||s.innerHTML||'';
    
    if(isTracker(src,code)){
      log('Removing existing tracker: '+(src||'inline'));
      B.blocked.push({tag:'script',src:src,code:code,parent:s.parentNode,next:s.nextSibling});
      s.dataset.consentBlocked='true';
      s.type='javascript/blocked';
      try{s.src='';s.textContent='';s.innerHTML='';}catch(e){}
      toRemove.push(s);
    }
  }
  
  for(var j=0;j<toRemove.length;j++){
    var r=toRemove[j];
    if(r.parentNode){
      try{r.parentNode.removeChild(r);}catch(e){}
    }
  }
  
  // Block iframes and tracking pixels
  var iframes=document.querySelectorAll('iframe');
  for(var i=0;i<iframes.length;i++){
    var ifr=iframes[i];
    if(ifr.dataset.consentBlocked==='true'||isEssential(ifr))continue;
    var src=ifr.getAttribute('src')||ifr.src||'';
    if(isTrackerUrl(src)){
      log('Removing tracker iframe: '+src);
      ifr.dataset.consentBlocked='true';
      if(ifr.parentNode)ifr.parentNode.removeChild(ifr);
    }
  }
  
  var imgs=document.querySelectorAll('img');
  for(var i=0;i<imgs.length;i++){
    var img=imgs[i];
    if(img.dataset.consentBlocked==='true'||isEssential(img))continue;
    var src=img.getAttribute('src')||img.src||'';
    if(isTrackerUrl(src)){
      log('Removing tracking pixel: '+src);
      img.dataset.consentBlocked='true';
      if(img.parentNode)img.parentNode.removeChild(img);
    }
  }
}

// Run immediately
blockExistingTrackers();
setTimeout(blockExistingTrackers,0);
setTimeout(blockExistingTrackers,10);
setTimeout(blockExistingTrackers,50);
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',blockExistingTrackers);
}
window.addEventListener('load',blockExistingTrackers);

/* ======================================================
   LAYER 2 — POST-LOAD ENFORCEMENT
====================================================== */

if(!hasConsent()){
  // MutationObserver
  var observer=new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      m.addedNodes.forEach(function(node){
        if(node.nodeType!==1)return;
        if(node.getAttribute&&node.getAttribute('data-consent')==='essential')return;
        if(node.dataset&&node.dataset.consentBlocked==='true')return;
        
        var tag=(node.tagName||'').toLowerCase();
        
        if(tag==='script'||tag==='iframe'||tag==='img'){
          var src=node.getAttribute('src')||node.src||'';
          var code=tag==='script'?(node.textContent||node.text||node.innerHTML||''):'';
          
          if(isTracker(src,code)&&!isEssential(node)){
            log('MutationObserver caught: '+(src||'inline '+tag));
            node.dataset.consentBlocked='true';
            if(tag==='script'){
              node.type='javascript/blocked';
              try{node.src='';node.textContent='';node.innerHTML='';}catch(e){}
            }
            if(node.parentNode)node.parentNode.removeChild(node);
          }
        }
        
        // Check children
        if(node.querySelectorAll){
          var children=node.querySelectorAll('script,iframe,img');
          for(var k=0;k<children.length;k++){
            var child=children[k];
            if(child.dataset.consentBlocked==='true'||isEssential(child))continue;
            var ctag=(child.tagName||'').toLowerCase();
            var csrc=child.getAttribute('src')||child.src||'';
            var ccode=ctag==='script'?(child.textContent||child.text||''):'';
            if(isTracker(csrc,ccode)){
              log('MutationObserver caught child: '+(csrc||'inline '+ctag));
              child.dataset.consentBlocked='true';
              if(ctag==='script'){
                child.type='javascript/blocked';
                try{child.src='';child.textContent='';child.innerHTML='';}catch(e){}
              }
              if(child.parentNode)child.parentNode.removeChild(child);
            }
          }
        }
      });
    });
  });
  
  observer.observe(document.documentElement||document,{childList:true,subtree:true});
  
  // fetch interception (third-party only)
  window.fetch=function(input,init){
    if(hasConsent())return _fetch.apply(window,arguments);
    var url=typeof input==='string'?input:(input&&input.url?input.url:'');
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED fetch: '+url);
      return Promise.reject(new Error('Blocked by consent'));
    }
    return _fetch.apply(window,arguments);
  };
  
  // XHR interception
  XMLHttpRequest.prototype.open=function(method,url){
    this._blockedUrl=null;
    if(!hasConsent()&&url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED XHR: '+url);
      this._blockedUrl=url;
      return;
    }
    return _XHRopen.apply(this,arguments);
  };
  
  XMLHttpRequest.prototype.send=function(data){
    if(this._blockedUrl)return;
    return _XHRsend.apply(this,arguments);
  };
  
  // sendBeacon interception
  navigator.sendBeacon=function(url,data){
    if(hasConsent())return _sendBeacon.apply(navigator,arguments);
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED sendBeacon: '+url);
      return false;
    }
    return _sendBeacon.apply(navigator,arguments);
  };
  
  // Image pixel blocking
  window.Image=function(w,h){
    var img=new _Image(w,h);
    var origSrcSet=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
    Object.defineProperty(img,'src',{
      set:function(url){
        if(!hasConsent()&&isTrackerUrl(url)&&!isFirstParty(url)){
          log('BLOCKED Image: '+url);
          return;
        }
        if(origSrcSet&&origSrcSet.set)origSrcSet.set.call(this,url);
      },
      get:function(){return this.getAttribute('src')||'';},
      configurable:true
    });
    return img;
  };
}

B.ready=true;
log('Pre-execution blocker ready');
})();`;
}

// Generate main script (banner, consent management)
function generateMainScript(siteId, allowedDomain, isPreview, config, bannerStyle, position, title, message, acceptText, rejectText, showReject, verifyCallbackUrl, trackUrl) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';
var CONSENT_KEY='${CONSENT_KEY}';
var isPreviewMode=${isPreview ? 'true' : 'false'};
var ALLOWED_DOMAIN='${isPreview ? '*' : allowedDomain}';

function hasConsent(){
  try{
    return localStorage.getItem(CONSENT_KEY)==='accepted';
  }catch(e){
    return false;
  }
}

// Domain check
var host=location.hostname.toLowerCase().replace(/^www\\./,'');
var allowed=ALLOWED_DOMAIN!=='*'?ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,''):null;
if(allowed&&host!==allowed){console.warn('[Consent] Domain mismatch');return;}

// Clear in preview
if(isPreviewMode){
  try{localStorage.removeItem(CONSENT_KEY);}catch(e){}
  var old=document.getElementById('cookie-banner');
  if(old)old.remove();
}

function enableTrackers(){
  if(window.__enableConsentTrackers)window.__enableConsentTrackers();
}

function showBanner(){
  if(!isPreviewMode&&hasConsent())return;
  if(document.getElementById('cookie-banner'))return;
  if(!document.body){setTimeout(showBanner,50);return;}
  
  var b=document.createElement('div');
  b.id='cookie-banner';
  b.setAttribute('data-consent','essential');
  
  var pos='${position}';
  var ps='';
  if(pos==='top')ps='top:0;left:0;right:0;';
  else if(pos==='bottom-left')ps='bottom:20px;left:20px;';
  else if(pos==='bottom-right')ps='bottom:20px;right:20px;';
  else if(pos==='top-left')ps='top:20px;left:20px;';
  else if(pos==='top-right')ps='top:20px;right:20px;';
  else ps='bottom:0;left:0;right:0;';
  
  b.style.cssText='position:fixed;'+ps+'background:${bannerStyle.backgroundColor};color:${bannerStyle.textColor};padding:${bannerStyle.padding};z-index:2147483647;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:${bannerStyle.fontSize};border-radius:${bannerStyle.borderRadius};${bannerStyle.boxShadow ? 'box-shadow:' + bannerStyle.boxShadow + ';' : ''}${bannerStyle.border ? 'border:' + bannerStyle.border + ';' : ''}';
  
  var c=document.createElement('div');
  c.style.cssText='flex:1;min-width:250px;';
  c.innerHTML='<strong style="display:block;margin-bottom:8px;font-size:16px;">🍪 ${title}</strong><span style="opacity:0.9;line-height:1.5;">${message}</span>';
  
  var btns=document.createElement('div');
  btns.style.cssText='display:flex;gap:10px;flex-wrap:wrap;';
  
  var acc=document.createElement('button');
  acc.textContent='${acceptText}';
  acc.style.cssText='background:${bannerStyle.buttonColor};color:${bannerStyle.buttonTextColor};border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:${bannerStyle.fontSize};';
  acc.onclick=function(){
    try{localStorage.setItem(CONSENT_KEY,'accepted');}catch(e){}
    b.remove();
    enableTrackers();
  };
  btns.appendChild(acc);
  
  ${showReject ? `
  var rej=document.createElement('button');
  rej.textContent='${rejectText}';
  rej.style.cssText='background:transparent;color:${bannerStyle.textColor};border:2px solid ${bannerStyle.textColor};padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:${bannerStyle.fontSize};';
  rej.onclick=function(){
    try{localStorage.setItem(CONSENT_KEY,'rejected');}catch(e){}
    b.remove();
  };
  btns.appendChild(rej);
  ` : ''}
  
  b.appendChild(c);
  b.appendChild(btns);
  document.body.appendChild(b);
}

// API calls
fetch('${verifyCallbackUrl}?domain='+encodeURIComponent(host)+'${isPreview ? '&preview=1' : ''}',{method:'GET',mode:'cors',credentials:'omit'}).catch(function(){});
fetch('${trackUrl}',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({pagePath:location.pathname,pageTitle:document.title})}).catch(function(){});

// Show banner
function init(){
  if(isPreviewMode||!hasConsent()){
    showBanner();
    setTimeout(showBanner,100);
    setTimeout(showBanner,500);
    setTimeout(showBanner,1000);
  }
}

if(window._cb&&window._cb.ready){
  init();
}else{
  var check=setInterval(function(){
    if(window._cb&&window._cb.ready){
      clearInterval(check);
      init();
    }
  },10);
  setTimeout(function(){clearInterval(check);init();},3000);
}
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

    const templateKey = effectiveConfig.template || DEFAULT_BANNER_CONFIG.template;
    const baseTemplate = BANNER_TEMPLATES[templateKey] || BANNER_TEMPLATES.minimal;
    
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
    const title = (effectiveConfig.title || DEFAULT_BANNER_CONFIG.title)
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const message = (effectiveConfig.message || effectiveConfig.description || DEFAULT_BANNER_CONFIG.message)
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const acceptText = (effectiveConfig.acceptButtonText || effectiveConfig.acceptText || DEFAULT_BANNER_CONFIG.acceptButtonText)
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const rejectText = (effectiveConfig.rejectButtonText || effectiveConfig.rejectText || DEFAULT_BANNER_CONFIG.rejectButtonText)
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const showReject = effectiveConfig.showRejectButton !== false;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const verifyCallbackUrl = `${baseUrl}/api/sites/${finalSiteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${finalSiteId}/track`;

    const inlineBlocker = generateInlineBlocker(finalSiteId, allowedDomain || '*', isPreview);
    const mainScript = generateMainScript(finalSiteId, allowedDomain || '*', isPreview, effectiveConfig, bannerStyle, position, title, message, acceptText, rejectText, showReject, verifyCallbackUrl, trackUrl);
    
    const returnInlineBlocker = searchParams.get("inline") === "1";
    
    if (returnInlineBlocker) {
      return new Response(inlineBlocker, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
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
var K='cookie_consent_fallback';
function show(){
  if(localStorage.getItem(K)==='accepted')return;
  if(document.getElementById('cb'))return;
  if(!document.body){setTimeout(show,100);return;}
  var b=document.createElement('div');
  b.id='cb';
  b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;font-family:sans-serif;';
  b.innerHTML='<div><strong>🍪 Cookies</strong><p style="margin:5px 0 0;font-size:14px;">This site uses cookies.</p></div><button id="cba" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;cursor:pointer;font-weight:bold;">Accept</button>';
  document.body.appendChild(b);
  document.getElementById('cba').onclick=function(){localStorage.setItem(K,'accepted');b.remove();};
}
show();
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
