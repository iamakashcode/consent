import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

// Generate AGGRESSIVE pre-execution blocker
function generateInlineBlocker(siteId, allowedDomain, isPreview, consentApiDomain) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';

/* ======================================================
   CRITICAL: Define noop FIRST (before anything else)
====================================================== */
var noop=function(){return undefined;};

/* ======================================================
   CONFIG
====================================================== */
var SITE_ID='${siteId}';
var CONSENT_KEY='${CONSENT_KEY}';
var DEBUG=true;
window.__consentGiven=false;

var TRACKER_PATTERNS=[
  'google-analytics','googletagmanager','gtag/js','gtag','analytics.js','ga.js','/gtm.js','google.com/pagead','googleadservices','googlesyndication','doubleclick',
  'facebook.net','facebook.com/tr','fbevents.js','connect.facebook','facebook.com','fbcdn.net','fbstatic','facebook',
  'clarity.ms','bing.com/bat',
  'hotjar','static.hotjar','mixpanel','amplitude','segment','segment.io','heapanalytics','fullstory','mouseflow','crazyegg','lucky-orange','inspectlet','logrocket',
  'analytics.twitter','static.ads-twitter','t.co/i/adsct',
  'snap.licdn','linkedin.com/px','ads.linkedin',
  'analytics.tiktok','tiktok.com/i18n',
  'pintrk','ct.pinterest',
  'sc-static.net','tr.snapchat',
  '/pixel','/beacon','/collect','/track','/analytics','/event','/conversion'
];

var TRACKER_CODE_PATTERNS=[
  'fbq(','fbq.push','_fbq','fbq.init','fbq.track','fbq.trackcustom','fbq.tracksingle','fbq.set','fbq.callmethod','fbq.queue','fbevents','facebook pixel','meta pixel',
  'gtag(','gtag.push','ga(','ga.push','_gaq.push','datalayer.push',
  'analytics.track','analytics.page','analytics.identify','analytics.alias',
  'mixpanel.track','mixpanel.identify','amplitude.','amplitude.getinstance',
  'hj(','hj.track','clarity(','clarity.identify',
  'pintrk(','pintrk.track','twq(','twq.track','snaptr(','snaptr.track','ttq.','ttq.track','ttq.page',
  '_linkedin','linkedininsight','_linkedin_data_partner_ids'
];

/* ======================================================
   HELPERS
====================================================== */
function log(msg){if(DEBUG)console.log('[ConsentBlock]',msg);}

function hasConsent(){
  if(window.__consentGiven===true)return true;
  try{
    var consent=localStorage.getItem(CONSENT_KEY)==='accepted';
    if(consent&&!window.__consentGiven){
      window.__consentGiven=true;
      log('Consent detected in localStorage - flag set');
    }
    return consent;
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
    var host=u.hostname.toLowerCase().replace(/^www\\./,'');
    var currentHost=location.hostname.toLowerCase().replace(/^www\\./,'');
    var consentHost='${consentApiDomain || ''}';
    return host===currentHost||(consentHost&&host===consentHost)||host.endsWith('.'+currentHost);
  }catch(e){
    return false;
  }
}

function isEssential(el){
  if(!el||!el.getAttribute)return false;
  return el.getAttribute('data-consent')==='essential'||el.getAttribute('data-cookieconsent')==='necessary';
}

/* ======================================================
   INITIALIZE BLOCKER OBJECT & STORE ORIGINALS
====================================================== */
var B=window._cb=window._cb||{};
B.key=CONSENT_KEY;
B.blocked=[];
B._currentScriptDesc=null;
B._scriptSrcDesc=null;

var _setAttribute=Element.prototype.setAttribute;
var _createElement=document.createElement;
var _appendChild=Node.prototype.appendChild;
var _insertBefore=Node.prototype.insertBefore;
var _fetch=window.fetch;
var _XHRopen=XMLHttpRequest.prototype.open;
var _XHRsend=XMLHttpRequest.prototype.send;
var _sendBeacon=navigator.sendBeacon;
var _Image=window.Image;
var _defineProperty=Object.defineProperty;
var _defineProperties=Object.defineProperties;
var _eval=window.eval;
var _Function=window.Function;
var _postMessage=window.postMessage;
var _write=document.write;
var _writeln=document.writeln;
var _append=Element.prototype.append;
var _prepend=Element.prototype.prepend;
var _insertAdjacentElement=Element.prototype.insertAdjacentElement;
var _insertAdjacentHTML=Element.prototype.insertAdjacentHTML;
var _origCall=Function.prototype.call;

B._origCall=_origCall;

/* ======================================================
   STEP 1: CREATE PROPER TRACKER STUBS
====================================================== */

var fbqStub=function(){
  log('fbq() call blocked');
  return undefined;
};
fbqStub.queue=[];
fbqStub.loaded=false;
fbqStub.version='2.0';
fbqStub.push=noop;
fbqStub.callMethod=noop;
fbqStub.track=noop;
fbqStub.trackCustom=noop;
fbqStub.trackSingle=noop;
fbqStub.init=noop;
fbqStub.set=noop;
fbqStub['delete']=noop;

try{
  delete window.fbq;
}catch(e){}
window.fbq=fbqStub;
try{
  Object.defineProperty(window,'fbq',{
    value:fbqStub,
    writable:true,
    configurable:true,
    enumerable:true
  });
}catch(e){}

var _fbqStub=noop;
try{
  delete window._fbq;
}catch(e){}
window._fbq=_fbqStub;
try{
  Object.defineProperty(window,'_fbq',{
    value:_fbqStub,
    writable:true,
    configurable:true,
    enumerable:true
  });
}catch(e){}

var gtagStub=function(){
  log('gtag() call blocked');
  return undefined;
};
try{
  delete window.gtag;
}catch(e){}
window.gtag=gtagStub;
try{
  Object.defineProperty(window,'gtag',{
    value:gtagStub,
    writable:true,
    configurable:true,
    enumerable:true
  });
}catch(e){}

var gaStub=noop;
try{
  delete window.ga;
}catch(e){}
window.ga=gaStub;
try{
  Object.defineProperty(window,'ga',{
    value:gaStub,
    writable:true,
    configurable:true,
    enumerable:true
  });
}catch(e){}

if(!window.dataLayer||!Array.isArray(window.dataLayer)){
  window.dataLayer=[];
}
B._origDataLayerPush=window.dataLayer.push&&typeof window.dataLayer.push==='function'?window.dataLayer.push:Array.prototype.push;
try{
  Object.defineProperty(window.dataLayer,'push',{
    value:function(){
      if(hasConsent()){
        var origPush=B._origDataLayerPush||Array.prototype.push;
        return origPush.apply(this,arguments);
      }
      log('dataLayer.push() blocked');
      return 0;
    },
    writable:true,
    configurable:true
  });
}catch(e){
  window.dataLayer.push=function(){
    if(hasConsent()){
      var origPush=B._origDataLayerPush||Array.prototype.push;
      return origPush.apply(this,arguments);
    }
    log('dataLayer.push() blocked');
    return 0;
  };
}

if(!window._gaq||!Array.isArray(window._gaq)){
  window._gaq=[];
}
B._origGaqPush=window._gaq.push&&typeof window._gaq.push==='function'?window._gaq.push:Array.prototype.push;
try{
  Object.defineProperty(window._gaq,'push',{
    value:function(){
      if(hasConsent()){
        var origPush=B._origGaqPush||Array.prototype.push;
        return origPush.apply(this,arguments);
      }
      log('_gaq.push() blocked');
      return 0;
    },
    writable:true,
    configurable:true
  });
}catch(e){
  window._gaq.push=function(){
    if(hasConsent()){
      var origPush=B._origGaqPush||Array.prototype.push;
      return origPush.apply(this,arguments);
    }
    log('_gaq.push() blocked');
    return 0;
  };
}

window.analytics={track:noop,page:noop,identify:noop,alias:noop,ready:noop,reset:noop};
window.mixpanel={track:noop,identify:noop,people:{set:noop}};
window.amplitude={getInstance:function(){return{logEvent:noop,setUserId:noop,init:noop};}};
window.hj=noop;
window.clarity=noop;
window._hsq=[];
window._hsq.push=noop;
window.twq=noop;
window.pintrk=noop;
window.ttq={track:noop,page:noop,identify:noop};
window.snaptr=noop;

log('Global tracker stubs initialized');

/* ======================================================
   STEP 2: INTERCEPT Function.prototype.call
====================================================== */
if(!hasConsent()){
  Function.prototype.call=function(){
    if(this===window.fbq||this===window._fbq||this===window.gtag||this===window.ga){
      log('Function.call blocked for tracker');
      return undefined;
    }
    return _origCall.apply(this,arguments);
  };
  log('Function.prototype.call intercepted');
}

/* ======================================================
   STEP 3: OVERRIDE Object.defineProperty
====================================================== */
Object.defineProperty=function(obj,prop,desc){
  if((obj===window||obj===globalThis)&&!hasConsent()){
    var blockedProps=['fbq','_fbq','gtag','ga','dataLayer','_gaq','analytics','mixpanel','amplitude','hj','clarity','_hsq','twq','pintrk','ttq','snaptr'];
    if(blockedProps.indexOf(prop)!==-1){
      log('BLOCKED defineProperty: '+prop);
      return obj;
    }
  }
  return _defineProperty.apply(Object,arguments);
};

Object.defineProperties=function(obj,props){
  if((obj===window||obj===globalThis)&&!hasConsent()){
    var blockedProps=['fbq','_fbq','gtag','ga','dataLayer','_gaq','analytics','mixpanel','amplitude','hj','clarity','_hsq','twq','pintrk','ttq','snaptr'];
    for(var p in props){
      if(blockedProps.indexOf(p)!==-1){
        log('BLOCKED defineProperties: '+p);
        delete props[p];
      }
    }
  }
  return _defineProperties.apply(Object,arguments);
};

/* ======================================================
   STEP 4: OVERRIDE SCRIPT CREATION & INSERTION
====================================================== */

B._currentScriptDesc=Object.getOwnPropertyDescriptor(Document.prototype,'currentScript');
if(B._currentScriptDesc&&B._currentScriptDesc.get){
  Object.defineProperty(Document.prototype,'currentScript',{
    get:function(){
      var script=B._currentScriptDesc.get.call(this);
      if(script&&!hasConsent()){
        var src=script.src||script.getAttribute('src')||'';
        var code=script.textContent||script.text||script.innerHTML||'';
        if(isTracker(src,code)){
          log('BLOCKED currentScript access');
          return null;
        }
      }
      return script;
    },
    configurable:true
  });
}

B._scriptSrcDesc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(B._scriptSrcDesc){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{
    get:function(){
      return this.getAttribute('src')||'';
    },
    set:function(url){
      if(!hasConsent()&&isTrackerUrl(url)&&!isEssential(this)){
        log('BLOCKED script src (prototype): '+url);
        this.setAttribute('data-blocked-src',url);
        this.setAttribute('data-consent-blocked','true');
        this.type='javascript/blocked';
        B.blocked.push({tag:'script',src:url,parent:this.parentNode,next:this.nextSibling});
        return;
      }
      this.setAttribute('src',url);
    },
    configurable:true,
    enumerable:true
  });
}

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

document.createElement=function(tag,opts){
  var el=_createElement.call(document,tag,opts);
  var t=(tag||'').toLowerCase();
  
  if(t==='script'&&!hasConsent()){
    var srcDesc=Object.getOwnPropertyDescriptor(el,'src')||{};
    Object.defineProperty(el,'src',{
      set:function(url){
        if(!hasConsent()&&isTrackerUrl(url)&&!isEssential(el)){
          log('BLOCKED createElement script src: '+url);
          el.type='javascript/blocked';
          el.dataset.blockedSrc=url;
          el.dataset.consentBlocked='true';
          B.blocked.push({tag:'script',src:url,parent:null,next:null});
          return;
        }
        _setAttribute.call(el,'src',url);
      },
      get:function(){return el.getAttribute('src')||'';},
      configurable:true
    });
    
    var origTextContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
    if(origTextContent){
      Object.defineProperty(el,'textContent',{
        set:function(code){
          if(!hasConsent()&&isTrackerCode(code)&&!isEssential(el)){
            log('BLOCKED inline script code');
            el.type='javascript/blocked';
            el.dataset.consentBlocked='true';
            B.blocked.push({tag:'script',code:code,parent:null,next:null});
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

Node.prototype.appendChild=function(child){
  if(child&&child.nodeType===1&&!hasConsent()){
    var tag=(child.tagName||'').toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!isEssential(child)){
      var src=child.getAttribute('src')||child.src||child.dataset.blockedSrc||'';
      var code=tag==='script'?(child.textContent||child.text||child.innerHTML||''):'';
      
      if(isTracker(src,code)){
        log('BLOCKED appendChild: '+(src||'inline '+tag));
        B.blocked.push({tag:tag,src:src,code:code,parent:this,next:null});
        child.dataset.consentBlocked='true';
        if(tag==='script'){
          child.type='javascript/blocked';
          try{
            child.removeAttribute('src');
            child.textContent='';
            child.innerHTML='';
          }catch(e){}
        }
        return child;
      }
    }
  }
  return _appendChild.call(this,child);
};

Node.prototype.insertBefore=function(newNode,refNode){
  if(newNode&&newNode.nodeType===1&&!hasConsent()){
    var tag=(newNode.tagName||'').toLowerCase();
    if((tag==='script'||tag==='iframe'||tag==='img')&&!isEssential(newNode)){
      var src=newNode.getAttribute('src')||newNode.src||newNode.dataset.blockedSrc||'';
      var code=tag==='script'?(newNode.textContent||newNode.text||newNode.innerHTML||''):'';
      
      if(isTracker(src,code)){
        log('BLOCKED insertBefore: '+(src||'inline '+tag));
        B.blocked.push({tag:tag,src:src,code:code,parent:this,next:refNode});
        newNode.dataset.consentBlocked='true';
        if(tag==='script'){
          newNode.type='javascript/blocked';
          try{
            newNode.removeAttribute('src');
            newNode.textContent='';
            newNode.innerHTML='';
          }catch(e){}
        }
        return newNode;
      }
    }
  }
  return _insertBefore.call(this,newNode,refNode);
};

if(Element.prototype.append){
  Element.prototype.append=function(){
    if(hasConsent()){
      return _append.apply(this,arguments);
    }
    for(var i=0;i<arguments.length;i++){
      var node=arguments[i];
      if(node&&node.nodeType===1){
        var tag=(node.tagName||'').toLowerCase();
        if((tag==='script'||tag==='iframe'||tag==='img')&&!isEssential(node)){
          var src=node.getAttribute('src')||node.src||'';
          var code=tag==='script'?(node.textContent||node.text||''):'';
          if(isTracker(src,code)){
            log('BLOCKED append: '+(src||'inline'));
            node.setAttribute('data-consent-blocked','true');
            if(src)node.setAttribute('data-blocked-src',src);
            if(tag==='script'){ node.type='javascript/blocked'; B.blocked.push({tag:tag,src:src,code:code,parent:this,next:null}); }
            continue;
          }
        }
      }
      _append.call(this,node);
    }
  };
}

if(Element.prototype.prepend){
  Element.prototype.prepend=function(){
    if(hasConsent()){
      return _prepend.apply(this,arguments);
    }
    for(var i=0;i<arguments.length;i++){
      var node=arguments[i];
      if(node&&node.nodeType===1){
        var tag=(node.tagName||'').toLowerCase();
        if((tag==='script'||tag==='iframe'||tag==='img')&&!isEssential(node)){
          var src=node.getAttribute('src')||node.src||'';
          var code=tag==='script'?(node.textContent||node.text||''):'';
          if(isTracker(src,code)){
            log('BLOCKED prepend: '+(src||'inline'));
            node.setAttribute('data-consent-blocked','true');
            if(src)node.setAttribute('data-blocked-src',src);
            if(tag==='script'){ node.type='javascript/blocked'; B.blocked.push({tag:tag,src:src,code:code,parent:this,next:null}); }
            continue;
          }
        }
      }
      _prepend.call(this,node);
    }
  };
}

/* ======================================================
   STEP 5: BLOCK EXISTING SCRIPTS IN DOM
====================================================== */
function blockExistingTrackers(){
  if(hasConsent())return;
  
  if(typeof document==='undefined'||!document.getElementsByTagName){
    setTimeout(blockExistingTrackers,10);
    return;
  }
  
  var scripts=document.getElementsByTagName('script');
  var blocked=0;
  
  for(var i=0;i<scripts.length;i++){
    var s=scripts[i];
    
    if(s.dataset&&s.dataset.consentBlocked==='true')continue;
    if(isEssential(s))continue;
    
    var src=s.getAttribute('src')||s.src||'';
    var code=s.textContent||s.text||s.innerHTML||'';
    
    if(isTracker(src,code)){
      log('BLOCKED existing script: '+(src||'inline'));
      
      B.blocked.push({
        tag:'script',
        src:src,
        code:code,
        parent:s.parentNode,
        next:s.nextSibling
      });
      
      s.setAttribute('data-consent-blocked','true');
      if(src)s.setAttribute('data-blocked-src',src);
      s.type='javascript/blocked';
      
      try{
        s.removeAttribute('src');
        s.textContent='';
        s.innerHTML='';
      }catch(e){}
      
      blocked++;
    }
  }
  
  if(blocked>0){
    log('Blocked '+blocked+' existing tracker script(s)');
  }
}

if(typeof document!=='undefined'){
  blockExistingTrackers();
}

setTimeout(blockExistingTrackers,0);
setTimeout(blockExistingTrackers,1);
setTimeout(blockExistingTrackers,10);
setTimeout(blockExistingTrackers,50);
setTimeout(blockExistingTrackers,100);

if(typeof document!=='undefined'){
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',blockExistingTrackers);
  }
}

/* ======================================================
   STEP 6: MUTATION OBSERVER FOR DYNAMIC CONTENT
====================================================== */
if(typeof MutationObserver!=='undefined'&&!hasConsent()){
  B.observer=new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      m.addedNodes.forEach(function(node){
        if(node.nodeType!==1)return;
        if(isEssential(node))return;
        if(node.dataset&&node.dataset.consentBlocked==='true')return;
        
        var tag=(node.tagName||'').toLowerCase();
        
        if(tag==='script'||tag==='iframe'||tag==='img'){
          var src=node.getAttribute('src')||node.src||'';
          var code=tag==='script'?(node.textContent||node.text||node.innerHTML||''):'';
          
          if(isTracker(src,code)){
            log('MutationObserver caught: '+(src||'inline '+tag));
            node.dataset.consentBlocked='true';
            
            if(tag==='script'){
              node.type='javascript/blocked';
              try{
                node.removeAttribute('src');
                node.textContent='';
                node.innerHTML='';
              }catch(e){}
            }
            
            if(node.parentNode){
              node.parentNode.removeChild(node);
            }
            
            B.blocked.push({tag:tag,src:src,code:code,parent:node.parentNode,next:null});
          }
        }
      });
    });
  });
  
  if(typeof document!=='undefined'&&document.documentElement){
    try{
      B.observer.observe(document.documentElement,{
        childList:true,
        subtree:true
      });
      log('MutationObserver started');
    }catch(e){
      log('MutationObserver error: '+e.message);
    }
  }
}

/* ======================================================
   STEP 7: BLOCK NETWORK REQUESTS
====================================================== */
if(!hasConsent()){
  window.fetch=function(input,init){
    if(hasConsent())return _fetch.apply(window,arguments);
    var url=typeof input==='string'?input:(input&&input.url?input.url:'');
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED fetch: '+url);
      return Promise.reject(new Error('Blocked by consent'));
    }
    return _fetch.apply(window,arguments);
  };
  
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
    if(this._blockedUrl){
      log('Skipped XHR send (blocked URL)');
      return;
    }
    return _XHRsend.apply(this,arguments);
  };
  
  navigator.sendBeacon=function(url,data){
    if(hasConsent())return _sendBeacon.apply(navigator,arguments);
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED sendBeacon: '+url);
      return false;
    }
    return _sendBeacon.apply(navigator,arguments);
  };
  
  window.Image=function(w,h){
    var img=new _Image(w,h);
    var origSrcDesc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
    Object.defineProperty(img,'src',{
      set:function(url){
        if(!hasConsent()&&isTrackerUrl(url)&&!isFirstParty(url)){
          log('BLOCKED Image pixel: '+url);
          return;
        }
        if(origSrcDesc&&origSrcDesc.set){
          origSrcDesc.set.call(this,url);
        }else{
          this.setAttribute('src',url);
        }
      },
      get:function(){
        return this.getAttribute('src')||'';
      },
      configurable:true
    });
    return img;
  };
}

/* ======================================================
   STEP 8: ENABLE TRACKERS FUNCTION
====================================================== */
window.__enableConsentTrackers=function(){
  try{
  log('__enableConsentTrackers called - starting enablement process');
  window.__consentGiven=true;
  
  var B=window._cb;
  if(!B){ log('Enable skipped: blocker not loaded'); return; }
  if(!B.blocked)B.blocked=[];
  
  if(B.observer){
    try{
      B.observer.disconnect();
      B.observer=null;
      log('✓ MutationObserver disconnected');
    }catch(e){}
  }
  
  Object.defineProperty=_defineProperty;
  Object.defineProperties=_defineProperties;
  if(B._currentScriptDesc){
    try{ Object.defineProperty(Document.prototype,'currentScript',B._currentScriptDesc); }catch(e){}
  }
  if(B._scriptSrcDesc){
    try{ Object.defineProperty(HTMLScriptElement.prototype,'src',B._scriptSrcDesc); }catch(e){}
  }
  Element.prototype.setAttribute=_setAttribute;
  document.createElement=_createElement;
  Node.prototype.appendChild=_appendChild;
  Node.prototype.insertBefore=_insertBefore;
  if(_append)Element.prototype.append=_append;
  if(_prepend)Element.prototype.prepend=_prepend;
  window.fetch=_fetch;
  XMLHttpRequest.prototype.open=_XHRopen;
  XMLHttpRequest.prototype.send=_XHRsend;
  navigator.sendBeacon=_sendBeacon;
  window.Image=_Image;
  Function.prototype.call=_origCall;
  log('✓ All DOM/API overrides restored');
  
  var stubsToDelete=['fbq','_fbq','gtag','ga','analytics','mixpanel','amplitude','hj','clarity','_hsq','twq','pintrk','ttq','snaptr'];
  for(var i=0;i<stubsToDelete.length;i++){
    try{ 
      delete window[stubsToDelete[i]]; 
      log('✓ Deleted stub: '+stubsToDelete[i]);
    }catch(e){ 
      try{ window[stubsToDelete[i]]=undefined; }catch(e2){} 
    }
  }
  
  if(window.dataLayer&&Array.isArray(window.dataLayer)){
    try{
      delete window.dataLayer.push;
      log('✓ Restored dataLayer.push to native');
    }catch(e){
      window.dataLayer.push=Array.prototype.push;
    }
  }
  if(window._gaq&&Array.isArray(window._gaq)){
    try{
      delete window._gaq.push;
      log('✓ Restored _gaq.push to native');
    }catch(e){
      window._gaq.push=Array.prototype.push;
    }
  }
  
  var toRestore=[];
  var seenUrls={};
  
  for(var j=0;j<B.blocked.length;j++){
    var b=B.blocked[j];
    if(b.tag==='script'&&b.src&&!seenUrls[b.src]){
      toRestore.push({src:b.src,parent:b.parent,next:b.next});
      seenUrls[b.src]=true;
    }
  }
  
  var existingBlocked=document.querySelectorAll('script[data-blocked-src]');
  for(var k=0;k<existingBlocked.length;k++){
    var s=existingBlocked[k];
    var blockedSrc=s.getAttribute('data-blocked-src');
    if(blockedSrc&&!seenUrls[blockedSrc]){
      toRestore.push({src:blockedSrc,parent:s.parentNode,next:s.nextSibling});
      seenUrls[blockedSrc]=true;
    }
  }
  
  log('✓ Found '+toRestore.length+' unique script(s) to restore');
  
  var head=document.head||document.documentElement;
  for(var m=0;m<toRestore.length;m++){
    var r=toRestore[m];
    var el=document.createElement('script');
    el.src=r.src;
    el.setAttribute('data-consent-restored','true');
    el.async=false;
    
    try{
      if(r.parent&&r.next&&r.parent.contains&&r.parent.contains(r.next)){
        r.parent.insertBefore(el,r.next);
      }else if(r.parent&&r.parent.appendChild){
        r.parent.appendChild(el);
      }else{
        head.appendChild(el);
      }
      log('✓ Restored script: '+r.src);
    }catch(e){
      head.appendChild(el);
      log('✓ Restored script (fallback): '+r.src);
    }
  }
  
  B.blocked=[];
  log('✓ Trackers enabled - scripts are now loading and will initialize');
  
  }catch(err){
    console.error('[ConsentFlow] __enableConsentTrackers error:',err);
  }
};

B.ready=true;
log('Pre-execution blocker ready. Consent: '+hasConsent());

if(hasConsent()){
  log('Consent already accepted - enabling trackers now');
  window.__enableConsentTrackers();
}
})();`;
}

function generateMainScript(siteId, allowedDomain, isPreview, config, bannerStyle, position, title, message, acceptText, rejectText, showReject, verifyCallbackUrl, trackUrl, templateStyle) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  const escapeForTemplate = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/\`/g, '\\`')
      .replace(/\$/g, '\\$');
  };
  
  const safeTitle = escapeForTemplate(title);
  const safeMessage = escapeForTemplate(message);
  const safeAccept = escapeForTemplate(acceptText);
  const safeReject = escapeForTemplate(rejectText);
  
  return `
/* ======================================================
   CONSENT BANNER & DOMAIN VERIFICATION
====================================================== */

var CONSENT_KEY='${CONSENT_KEY}';
var currentHost=location.hostname.toLowerCase().replace(/^www\\./,'');
var allowedHost='${allowedDomain || ''}'.toLowerCase().replace(/^www\\./,'');
var isPreview=${isPreview ? 'true' : 'false'};

if(!isPreview&&allowedHost&&currentHost!==allowedHost&&!currentHost.endsWith('.'+allowedHost)){
  console.warn('[ConsentFlow] Domain mismatch: '+currentHost+' !== '+allowedHost);
}

function hasConsent(){
  try{
    return localStorage.getItem(CONSENT_KEY)==='accepted';
  }catch(e){
    return false;
  }
}

function setConsent(value){
  try{
    window.__consentGiven=(value==='accepted');
    localStorage.setItem(CONSENT_KEY,value);
    console.log('[ConsentFlow] Consent set to:',value);
  }catch(e){
    console.error('[ConsentFlow] Failed to set consent:',e);
  }
}

var verificationAttempts=0;
var maxVerificationAttempts=5;

(function verifyDomain(){
  verificationAttempts++;
  
  if(!document.body){
    if(verificationAttempts<maxVerificationAttempts){
      setTimeout(verifyDomain,100);
    }
    return;
  }
  
  var verifyUrl='${verifyCallbackUrl}';
  if(!verifyUrl){
    if(verificationAttempts===1){
      console.warn('[ConsentFlow] No verification URL provided');
    }
    return;
  }
  
  var domainParam=encodeURIComponent(location.hostname);
  var fullUrl=verifyUrl+(verifyUrl.indexOf('?')===-1?'?':'&')+'domain='+domainParam;
  
  if(verificationAttempts===1){
    console.log('[ConsentFlow] Calling verification:',fullUrl);
  }
  
  try{
    fetch(fullUrl,{
      method:'GET',
      mode:'cors',
      credentials:'omit',
      headers:{
        'Accept':'application/json'
      }
    }).then(function(res){
      if(!res.ok){
        if(verificationAttempts<maxVerificationAttempts){
          setTimeout(verifyDomain,500);
          return null;
        }
        console.warn('[ConsentFlow] Verification response not OK:',res.status);
        return null;
      }
      return res.json();
    }).then(function(data){
      if(data&&data.connected){
        console.log('[ConsentFlow] ✓ Domain connected successfully:',data.domain||location.hostname);
      }else if(data){
        if(verificationAttempts<maxVerificationAttempts&&data.error){
          setTimeout(verifyDomain,500);
          return;
        }
        console.warn('[ConsentFlow] Verification failed:',data.error||data.message||'Unknown error');
      }
    }).catch(function(err){
      if(verificationAttempts<maxVerificationAttempts){
        setTimeout(verifyDomain,500);
        return;
      }
      console.warn('[ConsentFlow] Verification request failed:',err.message||err);
    });
  }catch(e){
    if(verificationAttempts<maxVerificationAttempts){
      setTimeout(verifyDomain,500);
      return;
    }
    console.warn('[ConsentFlow] Verification error:',e.message||e);
  }
})();

(function trackPageView(){
  if(!document.body)return setTimeout(trackPageView,50);
  
  var trackUrl='${trackUrl}';
  if(!trackUrl)return;
  
  try{
    fetch(trackUrl,{
      method:'POST',
      mode:'cors',
      credentials:'omit',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        url:location.href,
        referrer:document.referrer||'',
        timestamp:Date.now()
      })
    }).catch(function(err){});
  }catch(e){}
})();

(function showBanner(){
  if(hasConsent())return;
  if(document.getElementById('consentflow-banner'))return;
  if(!document.body)return setTimeout(showBanner,50);
  
  var banner=document.createElement('div');
  banner.id='consentflow-banner';
  banner.setAttribute('data-consent','essential');
  
  var styles='${bannerStyle || ''}';
  if(styles){
    banner.style.cssText=styles;
  }else{
    var pos='${position || 'bottom'}';
    banner.style.cssText=
      'position:fixed;'+
      (pos==='top'?'top:0;bottom:auto;':'bottom:0;top:auto;')+
      'left:0;right:0;'+
      'background:#1f2937;color:#fff;padding:20px;'+
      'display:flex;justify-content:space-between;'+
      'align-items:center;gap:15px;flex-wrap:wrap;'+
      'z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;'+
      'box-shadow:0 -4px 6px rgba(0,0,0,0.1);';
  }
  
  var templateStyleObj=${JSON.stringify(templateStyle || {})};
  var acceptBtnStyle='background:'+(templateStyleObj.buttonColor||'#22c55e')+';color:'+(templateStyleObj.buttonTextColor||'#fff')+';border:none;padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:'+(templateStyleObj.fontSize||'14px')+';';
  var rejectBtnStyle='background:transparent;color:'+(templateStyleObj.textColor||'#fff')+';border:2px solid '+(templateStyleObj.textColor||'#fff')+';padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:'+(templateStyleObj.fontSize||'14px')+';';
  
  banner.innerHTML=
    '<div style="flex:1;max-width:700px;">'+
    '<strong style="font-size:16px;display:block;margin-bottom:6px;">${safeTitle || '🍪 We use cookies'}</strong>'+
    '<p style="margin:0;font-size:14px;opacity:0.9;line-height:1.5;">${safeMessage || 'This site uses tracking cookies. Accept to enable analytics.'}</p>'+
    '</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
    '<button id="consentflow-accept" style="'+acceptBtnStyle+'">${safeAccept || 'Accept'}</button>'+
    ${showReject ? `'<button id="consentflow-reject" style="'+rejectBtnStyle+'">${safeReject || 'Reject'}</button>'+` : ''}
    '</div>';
  
  document.body.appendChild(banner);
  
  document.getElementById('consentflow-accept').onclick=function(){
    setConsent('accepted');
    banner.remove();
    console.log('[ConsentFlow] User accepted consent - enabling trackers');
    if(window.__enableConsentTrackers){
      try{ 
        window.__enableConsentTrackers(); 
      }catch(e){ 
        console.error('[ConsentFlow] Enable trackers error:',e); 
      }
    }
  };
  
  ${showReject ? `var rejectBtn=document.getElementById('consentflow-reject');
  if(rejectBtn){
    rejectBtn.onclick=function(){
      setConsent('rejected');
      banner.remove();
      console.log('[ConsentFlow] User rejected consent');
    };
  }` : ''}
})();
`;
}

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const { siteId } = resolvedParams;
    
    if (!siteId) {
      return new Response("// Site ID is required", {
        status: 400,
        headers: { "Content-Type": "application/javascript" },
      });
    }

    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");
    const isPreview = searchParams.get("preview") === "1";
    const configParam = searchParams.get("config");

    const site = await prisma.site.findUnique({
      where: { siteId },
      include: {
        subscription: true,
      },
    });

    if (!site) {
      return new Response("// Site not found", {
        status: 404,
        headers: { "Content-Type": "application/javascript" },
      });
    }

    if (!isPreview) {
      const subscriptionStatus = await isSubscriptionActive(site.id);
      if (!subscriptionStatus.isActive) {
        return new Response(
          `(function(){console.error('[Consent SDK] Access denied: Subscription inactive for this domain. ${subscriptionStatus.reason}');})();`,
          {
            status: 403,
            headers: { "Content-Type": "application/javascript" },
          }
        );
      }
    }

    const allowedDomain = domainParam || site.domain;
    
    const protocol = req.headers.get("x-forwarded-proto") || 
      (req.headers.get("host")?.includes("localhost") ? "http" : "https");
    const apiHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${apiHost}`;
    
    let consentApiHostname = "";
    try {
      const baseUrlObj = new URL(baseUrl);
      consentApiHostname = baseUrlObj.hostname.replace(/^www\./, "");
    } catch (e) {
      consentApiHostname = req.headers.get("host")?.replace(/^www\./, "") || "";
    }

    const bannerConfig = site.bannerConfig || DEFAULT_BANNER_CONFIG;
    const template = bannerConfig.template || "default";
    const templateConfig = BANNER_TEMPLATES[template] || BANNER_TEMPLATES.default;
    
    const title = bannerConfig.title || templateConfig.title || "🍪 We use cookies";
    const message = bannerConfig.message || templateConfig.message || "This site uses tracking cookies. Accept to enable analytics.";
    const acceptText = bannerConfig.acceptText || templateConfig.acceptText || "Accept";
    const rejectText = bannerConfig.rejectText || templateConfig.rejectText || "Reject";
    const showReject = bannerConfig.showReject !== false;
    const position = bannerConfig.position || "bottom";
    
    let bannerStyle = "";
    if (templateConfig.style) {
      const style = templateConfig.style;
      const posStyle = position === "top" ? "top:0;bottom:auto;" : "bottom:0;top:auto;";
      bannerStyle = 
        `position:fixed;${posStyle}left:0;right:0;` +
        `background:${style.backgroundColor || '#1f2937'};` +
        `color:${style.textColor || '#ffffff'};` +
        `padding:${style.padding || '20px'};` +
        `z-index:2147483647;` +
        `display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;` +
        `font-family:system-ui,-apple-system,sans-serif;` +
        `font-size:${style.fontSize || '14px'};` +
        (style.borderRadius ? `border-radius:${style.borderRadius};` : '') +
        (style.border ? `border:${style.border};` : '') +
        (style.boxShadow ? `box-shadow:${style.boxShadow};` : 'box-shadow:0 -4px 6px rgba(0,0,0,0.1);');
    }

    const actualSiteId = siteId;
    const verifyCallbackUrl = `${baseUrl}/api/sites/${actualSiteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${actualSiteId}/track`;

    const inlineBlocker = generateInlineBlocker(siteId, allowedDomain, isPreview, consentApiHostname);
    const mainScript = generateMainScript(
      siteId,
      allowedDomain,
      isPreview,
      bannerConfig,
      bannerStyle,
      position,
      title,
      message,
      acceptText,
      rejectText,
      showReject,
      verifyCallbackUrl,
      trackUrl,
      templateConfig.style
    );

    const fullScript = inlineBlocker + "\n" + mainScript;

    return new Response(fullScript, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[Script API] Error:", error);
    return new Response(
      `console.error('[Consent SDK] Error loading script: ${error.message}');`,
      {
        status: 500,
        headers: { "Content-Type": "application/javascript" },
      }
    );
  }
}