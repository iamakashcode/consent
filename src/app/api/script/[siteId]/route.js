import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

// Generate AGGRESSIVE pre-execution blocker
// Fixed generateInlineBlocker function
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

var TRACKER_PATTERNS=[
  // Google
  'google-analytics','googletagmanager','gtag/js','gtag','analytics.js','ga.js','/gtm.js','google.com/pagead','googleadservices','googlesyndication','doubleclick',
  // Meta/Facebook
  'facebook.net','facebook.com/tr','fbevents.js','connect.facebook','facebook.com','fbcdn.net','fbstatic','facebook',
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

// Store ALL originals IMMEDIATELY before any overrides
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

// Store for later restoration
B._origCall=_origCall;

/* ======================================================
   STEP 1: CREATE PROPER TRACKER STUBS (CookieYes-style)
   This must happen BEFORE any tracker scripts load
====================================================== */

// Create fbq stub with ALL required properties
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

// Set fbq as non-configurable
try{
  delete window.fbq;
}catch(e){}
window.fbq=fbqStub;
try{
  Object.defineProperty(window,'fbq',{
    value:fbqStub,
    writable:false,
    configurable:false,
    enumerable:true
  });
}catch(e){
  // Already set - that's okay
}

// Set _fbq
var _fbqStub=noop;
try{
  delete window._fbq;
}catch(e){}
window._fbq=_fbqStub;
try{
  Object.defineProperty(window,'_fbq',{
    value:_fbqStub,
    writable:false,
    configurable:false,
    enumerable:true
  });
}catch(e){}

// Set gtag
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
    writable:false,
    configurable:false,
    enumerable:true
  });
}catch(e){}

// Set ga
var gaStub=noop;
try{
  delete window.ga;
}catch(e){}
window.ga=gaStub;
try{
  Object.defineProperty(window,'ga',{
    value:gaStub,
    writable:false,
    configurable:false,
    enumerable:true
  });
}catch(e){}

// Set dataLayer with blocked push
window.dataLayer=window.dataLayer||[];
try{
  Object.defineProperty(window.dataLayer,'push',{
    value:function(){
      log('dataLayer.push() blocked');
      return 0;
    },
    writable:false,
    configurable:false
  });
}catch(e){
  window.dataLayer.push=function(){
    log('dataLayer.push() blocked');
    return 0;
  };
}

// Set other tracker stubs
window._gaq=window._gaq||[];
try{
  Object.defineProperty(window._gaq,'push',{
    value:function(){log('_gaq.push() blocked');return 0;},
    writable:false,
    configurable:false
  });
}catch(e){
  window._gaq.push=function(){log('_gaq.push() blocked');return 0;};
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
   This catches fbq('track', 'PageView') style calls
====================================================== */
if(!hasConsent()){
  Function.prototype.call=function(){
    // Check if this function is a blocked tracker
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
   Prevents trackers from redefining our stubs
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

// Override document.currentScript
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

// Override HTMLScriptElement.prototype.src
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
        return;
      }
      this.setAttribute('src',url);
    },
    configurable:true,
    enumerable:true
  });
}

// Override Element.prototype.setAttribute
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

// Override document.createElement
document.createElement=function(tag,opts){
  var el=_createElement.call(document,tag,opts);
  var t=(tag||'').toLowerCase();
  
  if(t==='script'&&!hasConsent()){
    // Override src setter on this specific element
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
    
    // Override textContent for inline scripts
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

// Override Node.prototype.appendChild
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
        // Return child but don't actually append
        return child;
      }
    }
  }
  return _appendChild.call(this,child);
};

// Override Node.prototype.insertBefore
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

// Override other insertion methods
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
            if(tag==='script')node.type='javascript/blocked';
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
            if(tag==='script')node.type='javascript/blocked';
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
  
  // Wait for document to exist
  if(typeof document==='undefined'||!document.getElementsByTagName){
    setTimeout(blockExistingTrackers,10);
    return;
  }
  
  var scripts=document.getElementsByTagName('script');
  var blocked=0;
  
  for(var i=0;i<scripts.length;i++){
    var s=scripts[i];
    
    // Skip if already processed or essential
    if(s.dataset&&s.dataset.consentBlocked==='true')continue;
    if(isEssential(s))continue;
    
    var src=s.getAttribute('src')||s.src||'';
    var code=s.textContent||s.text||s.innerHTML||'';
    
    if(isTracker(src,code)){
      log('BLOCKED existing script: '+(src||'inline'));
      
      // Store for later
      B.blocked.push({
        tag:'script',
        src:src,
        code:code,
        parent:s.parentNode,
        next:s.nextSibling
      });
      
      // Mark as blocked
      s.setAttribute('data-consent-blocked','true');
      s.type='javascript/blocked';
      
      // Clear content to prevent execution
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

// Run blocking at multiple stages
if(typeof document!=='undefined'){
  blockExistingTrackers();
}

// Run again after small delays to catch late-loading scripts
setTimeout(blockExistingTrackers,0);
setTimeout(blockExistingTrackers,1);
setTimeout(blockExistingTrackers,10);
setTimeout(blockExistingTrackers,50);
setTimeout(blockExistingTrackers,100);

// Run on DOM ready
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
            
            // Remove from DOM
            if(node.parentNode){
              node.parentNode.removeChild(node);
            }
            
            B.blocked.push({tag:tag,src:src,code:code,parent:node.parentNode,next:null});
          }
        }
      });
    });
  });
  
  // Start observing
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
  // Block fetch
  window.fetch=function(input,init){
    if(hasConsent())return _fetch.apply(window,arguments);
    var url=typeof input==='string'?input:(input&&input.url?input.url:'');
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED fetch: '+url);
      return Promise.reject(new Error('Blocked by consent'));
    }
    return _fetch.apply(window,arguments);
  };
  
  // Block XMLHttpRequest
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
  
  // Block sendBeacon
  navigator.sendBeacon=function(url,data){
    if(hasConsent())return _sendBeacon.apply(navigator,arguments);
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)){
      log('BLOCKED sendBeacon: '+url);
      return false;
    }
    return _sendBeacon.apply(navigator,arguments);
  };
  
  // Block Image pixels
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
  log('Enabling trackers...');
  
  // Restore all originals
  Object.defineProperty=_defineProperty;
  Object.defineProperties=_defineProperties;
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
  
  // Disconnect observer
  if(B.observer){
    try{
      B.observer.disconnect();
      log('MutationObserver disconnected');
    }catch(e){}
  }
  
  // Delete tracker stubs
  var propsToRemove=['fbq','_fbq','gtag','ga','analytics','mixpanel','amplitude','hj','clarity','_hsq','twq','pintrk','ttq','snaptr'];
  for(var i=0;i<propsToRemove.length;i++){
    try{
      delete window[propsToRemove[i]];
    }catch(e){
      try{
        window[propsToRemove[i]]=undefined;
      }catch(e2){}
    }
  }
  
  // Restore blocked scripts
  for(var i=0;i<B.blocked.length;i++){
    var b=B.blocked[i];
    if(!b.src&&!b.code)continue;
    
    var el=document.createElement(b.tag||'script');
    if(b.src)el.src=b.src;
    if(b.code)el.textContent=b.code;
    el.setAttribute('data-consent-restored','true');
    
    try{
      if(b.parent&&b.next&&b.parent.contains(b.next)){
        b.parent.insertBefore(el,b.next);
      }else if(b.parent){
        b.parent.appendChild(el);
      }else{
        document.head.appendChild(el);
      }
      log('Restored: '+(b.src||'inline script'));
    }catch(e){
      document.head.appendChild(el);
    }
  }
  
  B.blocked=[];
  log('Trackers enabled');
};

B.ready=true;
log('Pre-execution blocker ready. Consent: '+hasConsent());
})();`;
}
