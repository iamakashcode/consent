import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

// Generate AGGRESSIVE pre-execution blocker
function generateInlineBlocker(siteId, allowedDomain, isPreview) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';
// ============================================================
// AGGRESSIVE PRE-EXECUTION BLOCKER v2
// Must be the FIRST script in <head> to work properly
// ============================================================

var B=window._cb=window._cb||{};
B.key='${CONSENT_KEY}';
B.blocked=[];
B.debug=true;

// Log function
function log(msg){if(B.debug)console.log('[ConsentBlock]',msg);}

// Check consent LIVE
function hasConsent(){return localStorage.getItem(B.key)==='accepted';}

// COMPREHENSIVE tracker detection
var TRACKER_PATTERNS=[
  // Google
  'google-analytics','googletagmanager','gtag','analytics.js','ga.js','/gtm.js','/gtag/js','google.com/pagead','googleadservices','googlesyndication','doubleclick',
  // Facebook/Meta
  'facebook.net','facebook.com/tr','fbevents.js','connect.facebook','fbq','_fbq',
  // Microsoft
  'clarity.ms','bing.com/bat',
  // Other trackers
  'hotjar.com','static.hotjar','mixpanel.com','amplitude.com','segment.com','segment.io','heapanalytics','fullstory.com','mouseflow.com','crazyegg.com','lucky-orange','inspectlet.com','logrocket.com',
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
  'fbq(','fbq.push','_fbq','gtag(','gtag.push','ga(','ga.push','_gaq.push','dataLayer.push','analytics.track','analytics.page','mixpanel.track','amplitude.','hj(','clarity(','pintrk(','twq(','snaptr(','ttq.','_linkedin'
];

function isTracker(url,code){
  if(!url&&!code)return false;
  var s=((url||'')+(code||'')).toLowerCase();
  
  // Check URL patterns
  for(var i=0;i<TRACKER_PATTERNS.length;i++){
    if(s.indexOf(TRACKER_PATTERNS[i])!==-1)return true;
  }
  
  // Check code patterns
  for(var j=0;j<TRACKER_CODE_PATTERNS.length;j++){
    if(s.indexOf(TRACKER_CODE_PATTERNS[j])!==-1)return true;
  }
  
  return false;
}

function isEssential(el){
  if(!el||!el.getAttribute)return false;
  return el.getAttribute('data-consent')==='essential'||el.getAttribute('data-cookieconsent')==='necessary';
}

// Store originals IMMEDIATELY
B.originals={
  createElement:document.createElement,
  appendChild:Node.prototype.appendChild,
  insertBefore:Node.prototype.insertBefore,
  replaceChild:Node.prototype.replaceChild,
  append:Element.prototype.append,
  prepend:Element.prototype.prepend,
  insertAdjacentElement:Element.prototype.insertAdjacentElement,
  insertAdjacentHTML:Element.prototype.insertAdjacentHTML,
  write:document.write,
  writeln:document.writeln,
  fetch:window.fetch,
  XHRopen:XMLHttpRequest.prototype.open,
  XHRsend:XMLHttpRequest.prototype.send,
  sendBeacon:navigator.sendBeacon,
  Image:window.Image
};

// ============================================================
// STEP 1: STUB ALL TRACKING FUNCTIONS IMMEDIATELY
// ============================================================
log('Stubbing tracking functions...');

// Meta/Facebook Pixel
window.fbq=function(){log('fbq() blocked');};
window._fbq=window.fbq;
window.fbq.queue=[];window.fbq.loaded=true;window.fbq.version='2.0';
window.fbq.push=window.fbq;window.fbq.callMethod=function(){};

// Google Analytics / GTM
window.gtag=function(){log('gtag() blocked');};
window.dataLayer=window.dataLayer||[];
var origPush=Array.prototype.push;
window.dataLayer.push=function(){log('dataLayer.push() blocked');return 0;};
window.ga=function(){log('ga() blocked');};
window.ga.l=Date.now();window.ga.q=[];
window._gaq=window._gaq||[];
window._gaq.push=function(){log('_gaq.push() blocked');return 0;};

// Segment
window.analytics=window.analytics||{};
window.analytics.track=function(){log('analytics.track() blocked');};
window.analytics.page=function(){};
window.analytics.identify=function(){};
window.analytics.alias=function(){};
window.analytics.ready=function(){};
window.analytics.reset=function(){};

// Mixpanel
window.mixpanel=window.mixpanel||{};
window.mixpanel.track=function(){};
window.mixpanel.identify=function(){};
window.mixpanel.people={set:function(){}};

// Amplitude
window.amplitude=window.amplitude||{};
window.amplitude.getInstance=function(){return{logEvent:function(){},setUserId:function(){},init:function(){}};};

// Hotjar
window.hj=window.hj||function(){};
window._hjSettings=window._hjSettings||{};

// Clarity
window.clarity=window.clarity||function(){};

// HubSpot
window._hsq=window._hsq||[];
window._hsq.push=function(){};

// Twitter
window.twq=window.twq||function(){};

// Pinterest
window.pintrk=window.pintrk||function(){};

// TikTok
window.ttq=window.ttq||{track:function(){},page:function(){},identify:function(){}};

// Snapchat
window.snaptr=window.snaptr||function(){};

// LinkedIn
window._linkedin_data_partner_ids=[];

log('All tracking functions stubbed');

// ============================================================
// STEP 2: OVERRIDE HTMLScriptElement.prototype.src
// This catches ALL script src assignments at the prototype level
// ============================================================
log('Overriding HTMLScriptElement.prototype.src...');

var scriptSrcDescriptor=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(scriptSrcDescriptor){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{
    get:function(){
      return this.getAttribute('src')||'';
    },
    set:function(url){
      if(!hasConsent()&&!isEssential(this)&&isTracker(url,'')){
        log('BLOCKED script src: '+url);
        this.setAttribute('data-blocked-src',url);
        this.setAttribute('data-consent-blocked','true');
        this.type='javascript/blocked';
        return;
      }
      this.setAttribute('src',url);
    },
    configurable:true,
    enumerable:true
  });
}

// ============================================================
// STEP 3: OVERRIDE document.createElement
// Intercept script/iframe/img creation and modify their prototypes
// ============================================================
log('Overriding document.createElement...');

document.createElement=function(tag,opts){
  var el=B.originals.createElement.call(document,tag,opts);
  var t=tag.toLowerCase();
  
  if((t==='script'||t==='iframe'||t==='img')&&!hasConsent()){
    // Mark for tracking
    el._consentTracked=true;
    
    if(t==='script'){
      // Override src property on this specific element
      var elSrcSet=false;
      Object.defineProperty(el,'src',{
        get:function(){return this.getAttribute('src')||'';},
        set:function(url){
          if(!hasConsent()&&!isEssential(this)&&isTracker(url,'')){
            log('BLOCKED new script src: '+url);
            this.setAttribute('data-blocked-src',url);
            this.setAttribute('data-consent-blocked','true');
            this.type='javascript/blocked';
            elSrcSet=true;
            return;
          }
          this.setAttribute('src',url);
          elSrcSet=true;
        },
        configurable:true
      });
      
      // Override text property
      Object.defineProperty(el,'text',{
        get:function(){return this.textContent||'';},
        set:function(code){
          if(!hasConsent()&&isTracker('',code)){
            log('BLOCKED inline script text');
            this.setAttribute('data-consent-blocked','true');
            this.type='javascript/blocked';
            return;
          }
          this.textContent=code;
        },
        configurable:true
      });
    }
  }
  
  return el;
};

// ============================================================
// STEP 4: OVERRIDE Node.prototype.appendChild
// Block tracker nodes from being added to DOM
// ============================================================
log('Overriding appendChild...');

Node.prototype.appendChild=function(child){
  if(child&&child.nodeType===1){
    var tag=(child.tagName||'').toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(child)){
      var src=child.getAttribute('src')||child.src||'';
      var code=tag==='script'?(child.textContent||child.text||child.innerHTML||''):'';
      
      if(isTracker(src,code)){
        log('BLOCKED appendChild: '+(src||'inline script'));
        B.blocked.push({tag:tag,src:src,code:code,parent:this,next:null});
        child.setAttribute('data-consent-blocked','true');
        if(tag==='script')child.type='javascript/blocked';
        return child; // Return but don't append
      }
    }
  }
  return B.originals.appendChild.call(this,child);
};

// ============================================================
// STEP 5: OVERRIDE Node.prototype.insertBefore
// ============================================================
log('Overriding insertBefore...');

Node.prototype.insertBefore=function(newNode,refNode){
  if(newNode&&newNode.nodeType===1){
    var tag=(newNode.tagName||'').toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(newNode)){
      var src=newNode.getAttribute('src')||newNode.src||'';
      var code=tag==='script'?(newNode.textContent||newNode.text||newNode.innerHTML||''):'';
      
      if(isTracker(src,code)){
        log('BLOCKED insertBefore: '+(src||'inline script'));
        B.blocked.push({tag:tag,src:src,code:code,parent:this,next:refNode});
        newNode.setAttribute('data-consent-blocked','true');
        if(tag==='script')newNode.type='javascript/blocked';
        return newNode;
      }
    }
  }
  return B.originals.insertBefore.call(this,newNode,refNode);
};

// ============================================================
// STEP 6: OVERRIDE Element.prototype.append/prepend
// ============================================================
if(Element.prototype.append){
  Element.prototype.append=function(){
    for(var i=0;i<arguments.length;i++){
      var node=arguments[i];
      if(node&&node.nodeType===1){
        var tag=(node.tagName||'').toLowerCase();
        if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(node)){
          var src=node.getAttribute('src')||node.src||'';
          var code=tag==='script'?(node.textContent||node.text||''):'';
          if(isTracker(src,code)){
            log('BLOCKED append: '+(src||'inline'));
            node.setAttribute('data-consent-blocked','true');
            if(tag==='script')node.type='javascript/blocked';
            continue;
          }
        }
      }
      B.originals.append.call(this,node);
    }
  };
}

if(Element.prototype.prepend){
  Element.prototype.prepend=function(){
    for(var i=0;i<arguments.length;i++){
      var node=arguments[i];
      if(node&&node.nodeType===1){
        var tag=(node.tagName||'').toLowerCase();
        if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(node)){
          var src=node.getAttribute('src')||node.src||'';
          var code=tag==='script'?(node.textContent||node.text||''):'';
          if(isTracker(src,code)){
            log('BLOCKED prepend: '+(src||'inline'));
            node.setAttribute('data-consent-blocked','true');
            if(tag==='script')node.type='javascript/blocked';
            continue;
          }
        }
      }
      B.originals.prepend.call(this,node);
    }
  };
}

// ============================================================
// STEP 7: OVERRIDE document.write/writeln
// Block tracker injection via document.write
// ============================================================
log('Overriding document.write...');

document.write=function(html){
  if(!hasConsent()&&isTracker('',html)){
    log('BLOCKED document.write');
    return;
  }
  return B.originals.write.call(document,html);
};

document.writeln=function(html){
  if(!hasConsent()&&isTracker('',html)){
    log('BLOCKED document.writeln');
    return;
  }
  return B.originals.writeln.call(document,html);
};

// ============================================================
// STEP 8: OVERRIDE insertAdjacentElement/insertAdjacentHTML
// ============================================================
if(Element.prototype.insertAdjacentElement){
  Element.prototype.insertAdjacentElement=function(pos,el){
    if(el&&el.nodeType===1){
      var tag=(el.tagName||'').toLowerCase();
      if((tag==='script'||tag==='iframe'||tag==='img')&&!hasConsent()&&!isEssential(el)){
        var src=el.getAttribute('src')||el.src||'';
        var code=tag==='script'?(el.textContent||el.text||''):'';
        if(isTracker(src,code)){
          log('BLOCKED insertAdjacentElement: '+(src||'inline'));
          el.setAttribute('data-consent-blocked','true');
          if(tag==='script')el.type='javascript/blocked';
          return el;
        }
      }
    }
    return B.originals.insertAdjacentElement.call(this,pos,el);
  };
}

if(Element.prototype.insertAdjacentHTML){
  Element.prototype.insertAdjacentHTML=function(pos,html){
    if(!hasConsent()&&isTracker('',html)){
      log('BLOCKED insertAdjacentHTML');
      return;
    }
    return B.originals.insertAdjacentHTML.call(this,pos,html);
  };
}

// ============================================================
// STEP 9: NETWORK INTERCEPTION
// ============================================================
log('Setting up network interception...');

window.fetch=function(input,init){
  if(hasConsent())return B.originals.fetch.apply(window,arguments);
  var url=typeof input==='string'?input:(input&&input.url?input.url:'');
  if(url&&isTracker(url,'')){
    log('BLOCKED fetch: '+url);
    return Promise.reject(new Error('Blocked by consent'));
  }
  return B.originals.fetch.apply(window,arguments);
};

XMLHttpRequest.prototype.open=function(method,url){
  this._blockedUrl=null;
  if(!hasConsent()&&url&&isTracker(url,'')){
    log('BLOCKED XHR: '+url);
    this._blockedUrl=url;
    return;
  }
  return B.originals.XHRopen.apply(this,arguments);
};

XMLHttpRequest.prototype.send=function(data){
  if(this._blockedUrl)return;
  return B.originals.XHRsend.apply(this,arguments);
};

navigator.sendBeacon=function(url,data){
  if(hasConsent())return B.originals.sendBeacon.apply(navigator,arguments);
  if(url&&isTracker(url,'')){
    log('BLOCKED sendBeacon: '+url);
    return false;
  }
  return B.originals.sendBeacon.apply(navigator,arguments);
};

window.Image=function(w,h){
  var img=new B.originals.Image(w,h);
  var origSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(img,'src',{
    get:function(){return this.getAttribute('src')||'';},
    set:function(url){
      if(!hasConsent()&&isTracker(url,'')){
        log('BLOCKED Image: '+url);
        return;
      }
      this.setAttribute('src',url);
    },
    configurable:true
  });
  return img;
};

// ============================================================
// STEP 10: SCAN AND BLOCK EXISTING SCRIPTS
// ============================================================
function blockExistingTrackers(){
  if(hasConsent())return;
  log('Scanning for existing trackers...');
  
  // Block scripts
  var scripts=document.querySelectorAll('script');
  for(var i=0;i<scripts.length;i++){
    var s=scripts[i];
    if(s.getAttribute('data-consent-blocked')==='true')continue;
    if(isEssential(s))continue;
    
    var src=s.getAttribute('src')||s.src||'';
    var code=s.textContent||s.text||s.innerHTML||'';
    
    if(isTracker(src,code)){
      log('Removing existing tracker: '+(src||'inline'));
      B.blocked.push({tag:'script',src:src,code:code,parent:s.parentNode,next:s.nextSibling});
      s.setAttribute('data-consent-blocked','true');
      s.type='javascript/blocked';
      if(s.parentNode)s.parentNode.removeChild(s);
    }
  }
  
  // Block iframes
  var iframes=document.querySelectorAll('iframe');
  for(var i=0;i<iframes.length;i++){
    var ifr=iframes[i];
    if(ifr.getAttribute('data-consent-blocked')==='true')continue;
    if(isEssential(ifr))continue;
    
    var src=ifr.getAttribute('src')||ifr.src||'';
    if(isTracker(src,'')){
      log('Removing tracker iframe: '+src);
      B.blocked.push({tag:'iframe',src:src,parent:ifr.parentNode,next:ifr.nextSibling});
      ifr.setAttribute('data-consent-blocked','true');
      if(ifr.parentNode)ifr.parentNode.removeChild(ifr);
    }
  }
  
  // Block tracking pixels
  var imgs=document.querySelectorAll('img');
  for(var i=0;i<imgs.length;i++){
    var img=imgs[i];
    if(img.getAttribute('data-consent-blocked')==='true')continue;
    if(isEssential(img))continue;
    
    var src=img.getAttribute('src')||img.src||'';
    if(isTracker(src,'')){
      log('Removing tracking pixel: '+src);
      B.blocked.push({tag:'img',src:src,parent:img.parentNode,next:img.nextSibling});
      img.setAttribute('data-consent-blocked','true');
      if(img.parentNode)img.parentNode.removeChild(img);
    }
  }
}

// Run immediately
blockExistingTrackers();

// Run on DOM ready
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',blockExistingTrackers);
}

// Run on load
window.addEventListener('load',blockExistingTrackers);

// ============================================================
// STEP 11: MUTATION OBSERVER - Catch dynamic injections
// ============================================================
log('Setting up MutationObserver...');

B.observer=new MutationObserver(function(mutations){
  if(hasConsent())return;
  
  for(var i=0;i<mutations.length;i++){
    var added=mutations[i].addedNodes;
    for(var j=0;j<added.length;j++){
      var node=added[j];
      if(node.nodeType!==1)continue;
      
      var tag=(node.tagName||'').toLowerCase();
      
      if(tag==='script'||tag==='iframe'||tag==='img'){
        if(node.getAttribute('data-consent-blocked')==='true')continue;
        if(isEssential(node))continue;
        
        var src=node.getAttribute('src')||node.src||'';
        var code=tag==='script'?(node.textContent||node.text||node.innerHTML||''):'';
        
        if(isTracker(src,code)){
          log('MutationObserver caught: '+(src||'inline '+tag));
          B.blocked.push({tag:tag,src:src,code:code,parent:node.parentNode,next:node.nextSibling});
          node.setAttribute('data-consent-blocked','true');
          if(tag==='script')node.type='javascript/blocked';
          if(node.parentNode)node.parentNode.removeChild(node);
        }
      }
      
      // Check children
      if(node.querySelectorAll){
        var children=node.querySelectorAll('script,iframe,img');
        for(var k=0;k<children.length;k++){
          var child=children[k];
          var ctag=(child.tagName||'').toLowerCase();
          if(child.getAttribute('data-consent-blocked')==='true')continue;
          if(isEssential(child))continue;
          
          var csrc=child.getAttribute('src')||child.src||'';
          var ccode=ctag==='script'?(child.textContent||child.text||''):'';
          
          if(isTracker(csrc,ccode)){
            log('MutationObserver caught child: '+(csrc||'inline '+ctag));
            B.blocked.push({tag:ctag,src:csrc,code:ccode,parent:child.parentNode,next:child.nextSibling});
            child.setAttribute('data-consent-blocked','true');
            if(ctag==='script')child.type='javascript/blocked';
            if(child.parentNode)child.parentNode.removeChild(child);
          }
        }
      }
    }
  }
});

B.observer.observe(document.documentElement||document,{childList:true,subtree:true});

// ============================================================
// STEP 12: ENABLE FUNCTION - Restore on consent
// ============================================================
B.enable=function(){
  log('Enabling trackers...');
  
  // Restore DOM methods
  document.createElement=B.originals.createElement;
  Node.prototype.appendChild=B.originals.appendChild;
  Node.prototype.insertBefore=B.originals.insertBefore;
  if(B.originals.append)Element.prototype.append=B.originals.append;
  if(B.originals.prepend)Element.prototype.prepend=B.originals.prepend;
  if(B.originals.insertAdjacentElement)Element.prototype.insertAdjacentElement=B.originals.insertAdjacentElement;
  if(B.originals.insertAdjacentHTML)Element.prototype.insertAdjacentHTML=B.originals.insertAdjacentHTML;
  document.write=B.originals.write;
  document.writeln=B.originals.writeln;
  
  // Restore network
  window.fetch=B.originals.fetch;
  XMLHttpRequest.prototype.open=B.originals.XHRopen;
  XMLHttpRequest.prototype.send=B.originals.XHRsend;
  navigator.sendBeacon=B.originals.sendBeacon;
  window.Image=B.originals.Image;
  
  // Stop observer
  if(B.observer)B.observer.disconnect();
  
  // Restore HTMLScriptElement.prototype.src
  if(scriptSrcDescriptor){
    Object.defineProperty(HTMLScriptElement.prototype,'src',scriptSrcDescriptor);
  }
  
  // Remove function stubs
  delete window.fbq;delete window._fbq;
  delete window.gtag;
  delete window.ga;
  delete window.analytics;
  delete window.mixpanel;
  delete window.amplitude;
  delete window.hj;
  delete window.clarity;
  delete window._hsq;
  delete window.twq;
  delete window.pintrk;
  delete window.ttq;
  delete window.snaptr;
  
  // Reload blocked external scripts
  for(var i=0;i<B.blocked.length;i++){
    var b=B.blocked[i];
    if(!b.src||!b.parent)continue; // Skip inline
    
    var el=document.createElement(b.tag);
    el.src=b.src;
    el.setAttribute('data-consent-restored','true');
    
    try{
      if(b.next&&b.parent.contains(b.next)){
        b.parent.insertBefore(el,b.next);
      }else{
        b.parent.appendChild(el);
      }
      log('Restored: '+b.src);
    }catch(e){
      document.head.appendChild(el);
    }
  }
  
  B.blocked=[];
  log('Trackers enabled');
};

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

function hasConsent(){return localStorage.getItem(CONSENT_KEY)==='accepted';}

// Domain check
var host=location.hostname.toLowerCase().replace(/^www\\./,'');
var allowed=ALLOWED_DOMAIN!=='*'?ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,''):null;
if(allowed&&host!==allowed){console.warn('[Consent] Domain mismatch');return;}

// Clear in preview
if(isPreviewMode){
  localStorage.removeItem(CONSENT_KEY);
  var old=document.getElementById('cookie-banner');
  if(old)old.remove();
}

function enableTrackers(){
  if(window._cb&&window._cb.enable)window._cb.enable();
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
    localStorage.setItem(CONSENT_KEY,'accepted');
    b.remove();
    enableTrackers();
  };
  btns.appendChild(acc);
  
  ${showReject ? `
  var rej=document.createElement('button');
  rej.textContent='${rejectText}';
  rej.style.cssText='background:transparent;color:${bannerStyle.textColor};border:2px solid ${bannerStyle.textColor};padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:${bannerStyle.fontSize};';
  rej.onclick=function(){
    localStorage.setItem(CONSENT_KEY,'rejected');
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
    const title = (effectiveConfig.title || DEFAULT_BANNER_CONFIG.title).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const message = (effectiveConfig.message || effectiveConfig.description || DEFAULT_BANNER_CONFIG.message).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const acceptText = (effectiveConfig.acceptButtonText || effectiveConfig.acceptText || DEFAULT_BANNER_CONFIG.acceptButtonText).replace(/'/g, "\\'").replace(/"/g, '\\"');
    const rejectText = (effectiveConfig.rejectButtonText || effectiveConfig.rejectText || DEFAULT_BANNER_CONFIG.rejectButtonText).replace(/'/g, "\\'").replace(/"/g, '\\"');
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
