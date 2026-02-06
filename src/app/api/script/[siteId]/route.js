import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES, normalizeBannerConfig } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";
import { getScript, getCdnUrl } from "@/lib/cdn-service";

// Generate AGGRESSIVE pre-execution blocker with IMPROVEMENTS
export function generateInlineBlocker(siteId, allowedDomain, isPreview, consentApiDomain) {
  const CONSENT_KEY = `cookie_consent_${siteId}`;
  
  return `(function(){
'use strict';

/* ======================================================
   DOMAIN VALIDATION - CRITICAL: Must be FIRST before anything else
====================================================== */
var ALLOWED_DOMAIN='${allowedDomain || ''}';
var IS_PREVIEW=${isPreview ? 'true' : 'false'};

if(IS_PREVIEW!=='true'&&ALLOWED_DOMAIN){
  var currentHost=(location.hostname||'').toLowerCase().replace(/^www\\./,'');
  var allowedHost=ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,'');
  if(currentHost&&allowedHost&&currentHost!==allowedHost&&!currentHost.endsWith('.'+allowedHost)){
    console.error('[ConsentFlow] DOMAIN MISMATCH: Script configured for "'+allowedHost+'" but running on "'+currentHost+'". Script disabled.');
    return;
  }
}

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

var ANALYTICS_PATTERNS=['google-analytics','googletagmanager','gtag/js','gtag','analytics.js','ga.js','/gtm.js','clarity.ms','hotjar','static.hotjar','mixpanel','amplitude','segment','segment.io','heapanalytics','fullstory','mouseflow','crazyegg','lucky-orange','inspectlet','logrocket','omniture','adobe.com/analytics'];
var MARKETING_PATTERNS=['facebook.net','facebook.com/tr','fbevents.js','connect.facebook','facebook.com','fbcdn.net','fbstatic','facebook','google.com/pagead','googleadservices','googlesyndication','doubleclick','analytics.twitter','static.ads-twitter','t.co/i/adsct','snap.licdn','linkedin.com/px','ads.linkedin','analytics.tiktok','tiktok.com/i18n','pintrk','ct.pinterest','sc-static.net','tr.snapchat','bing.com/bat'];
var ANALYTICS_CODE=['gtag(','gtag.push','ga(','ga.push','_gaq.push','datalayer.push','analytics.track','analytics.page','analytics.identify','mixpanel.track','mixpanel.identify','amplitude.','amplitude.getinstance','hj(','hj.track','clarity(','clarity.identify'];
var MARKETING_CODE=['fbq(','fbq.push','_fbq','fbq.init','fbq.track','fbq.trackcustom','fbevents','facebook pixel','meta pixel','pintrk(','pintrk.track','twq(','twq.track','snaptr(','snaptr.track','ttq.','ttq.track','_linkedin','linkedininsight','_linkedin_data_partner_ids'];

/* ======================================================
   HELPERS
====================================================== */
function log(msg){if(DEBUG)console.log('[ConsentBlock]',msg);}

function getTrackerCategoryFromUrl(url){
  if(!url)return null;
  var u=url.toLowerCase();
  for(var i=0;i<ANALYTICS_PATTERNS.length;i++){ if(u.indexOf(ANALYTICS_PATTERNS[i])!==-1)return 'analytics'; }
  for(var i=0;i<MARKETING_PATTERNS.length;i++){ if(u.indexOf(MARKETING_PATTERNS[i])!==-1)return 'marketing'; }
  return 'marketing';
}
function getTrackerCategoryFromCode(code){
  if(!code)return null;
  var c=code.toLowerCase();
  for(var i=0;i<ANALYTICS_CODE.length;i++){ if(c.indexOf(ANALYTICS_CODE[i])!==-1)return 'analytics'; }
  for(var i=0;i<MARKETING_CODE.length;i++){ if(c.indexOf(MARKETING_CODE[i])!==-1)return 'marketing'; }
  return 'marketing';
}
function getTrackerCategory(url,code){
  var fromUrl=getTrackerCategoryFromUrl(url);
  var fromCode=getTrackerCategoryFromCode(code);
  return fromUrl||fromCode||'marketing';
}

function getConsentData(){
  try{
    var raw=localStorage.getItem(CONSENT_KEY);
    if(raw==='rejected')return {rejected:true,categories:{analytics:false,marketing:false}};
    if(raw==='accepted')return {accepted:true,categories:{analytics:true,marketing:true}};
    if(raw&&raw.charAt(0)==='{'){
      try{
        var obj=JSON.parse(raw);
        if(obj&&typeof obj==='object'){
          return {
            accepted:false,
            rejected:false,
            categories:{
              analytics:!!obj.analytics,
              marketing:!!obj.marketing
            }
          };
        }
      }catch(e){}
    }
  }catch(e){}
  return {rejected:false,accepted:false,categories:{analytics:false,marketing:false}};
}
function hasConsentForCategory(cat){
  var d=getConsentData();
  if(d.rejected)return false;
  if(d.accepted)return true;
  return !!d.categories[cat];
}
function hasConsent(){
  if(window.__consentGiven===true)return true;
  var d=getConsentData();
  if(d.rejected)return false;
  if(d.accepted)return true;
  return false;
}
function hasConsentForTracker(url,code){
  var cat=getTrackerCategory(url,code);
  return hasConsentForCategory(cat);
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
        if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
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
      if(!hasConsentForTracker(url,'')&&isTrackerUrl(url)&&!isEssential(this)){
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
  if(!hasConsentForTracker(value,'')&&this.tagName==='SCRIPT'&&name==='src'&&isTrackerUrl(value)&&!isEssential(this)){
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
        if(!hasConsentForTracker(url,'')&&isTrackerUrl(url)&&!isEssential(el)){
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
          if(!hasConsentForTracker('',code)&&isTrackerCode(code)&&!isEssential(el)){
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
      
      if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
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
      
      if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
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
          if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
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
          if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
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
   STEP 5: BLOCK EXISTING SCRIPTS IN DOM - IMPROVED
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
    
    if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
      log('BLOCKED existing script: '+(src||'inline'));
      
      // IMPROVED: Store complete script information including attributes
      var attributes={};
      if(s.attributes){
        for(var j=0;j<s.attributes.length;j++){
          var attr=s.attributes[j];
          if(attr.name!=='src'&&attr.name!=='type'){
            attributes[attr.name]=attr.value;
          }
        }
      }
      
      B.blocked.push({
        tag:'script',
        src:src,
        code:code,
        parent:s.parentNode,
        next:s.nextSibling,
        async:s.async,
        defer:s.defer,
        type:s.getAttribute('type'),
        attributes:attributes
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
          
          if(isTracker(src,code)&&!hasConsentForTracker(src,code)){
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
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)&&!hasConsentForTracker(url,'')){
      log('BLOCKED fetch: '+url);
      return Promise.reject(new Error('Blocked by consent'));
    }
    return _fetch.apply(window,arguments);
  };
  
  XMLHttpRequest.prototype.open=function(method,url){
    this._blockedUrl=null;
    if(!hasConsentForTracker(url,'')&&url&&isTrackerUrl(url)&&!isFirstParty(url)){
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
    if(url&&isTrackerUrl(url)&&!isFirstParty(url)&&!hasConsentForTracker(url,'')){
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
        if(!hasConsentForTracker(url,'')&&isTrackerUrl(url)&&!isFirstParty(url)){
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
   STEP 8: ENABLE TRACKERS FUNCTION - FULLY IMPROVED
====================================================== */
window.__enableConsentTrackers=function(){
  try{
    log('__enableConsentTrackers called - starting enablement process');
    window.__consentGiven=true;
    
    var B=window._cb;
    if(!B){ 
      log('Enable skipped: blocker not loaded'); 
      return; 
    }
    if(!B.blocked)B.blocked=[];
    
    // Disconnect observer first
    if(B.observer){
      try{
        B.observer.disconnect();
        B.observer=null;
        log('✓ MutationObserver disconnected');
      }catch(e){}
    }
    
    // Restore all overrides
    Object.defineProperty=_defineProperty;
    Object.defineProperties=_defineProperties;
    if(B._currentScriptDesc){
      try{ 
        Object.defineProperty(Document.prototype,'currentScript',B._currentScriptDesc); 
      }catch(e){}
    }
    if(B._scriptSrcDesc){
      try{ 
        Object.defineProperty(HTMLScriptElement.prototype,'src',B._scriptSrcDesc); 
      }catch(e){}
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
    
    // Delete stubs completely
    var stubsToDelete=['fbq','_fbq','gtag','ga','analytics','mixpanel','amplitude','hj','clarity','_hsq','twq','pintrk','ttq','snaptr'];
    for(var i=0;i<stubsToDelete.length;i++){
      try{ 
        delete window[stubsToDelete[i]]; 
        log('✓ Deleted stub: '+stubsToDelete[i]);
      }catch(e){ 
        try{ 
          window[stubsToDelete[i]]=undefined; 
        }catch(e2){} 
      }
    }
    
    // Restore dataLayer.push
    if(window.dataLayer&&Array.isArray(window.dataLayer)){
      if(B._origDataLayerPush){
        try{
          Object.defineProperty(window.dataLayer,'push',{
            value:B._origDataLayerPush,
            writable:true,
            configurable:true
          });
          log('✓ Restored dataLayer.push to original');
        }catch(e){
          window.dataLayer.push=B._origDataLayerPush;
        }
      }else{
        try{
          delete window.dataLayer.push;
          log('✓ Restored dataLayer.push to native');
        }catch(e){
          window.dataLayer.push=Array.prototype.push;
        }
      }
    }
    
    // Restore _gaq.push
    if(window._gaq&&Array.isArray(window._gaq)){
      if(B._origGaqPush){
        try{
          Object.defineProperty(window._gaq,'push',{
            value:B._origGaqPush,
            writable:true,
            configurable:true
          });
          log('✓ Restored _gaq.push to original');
        }catch(e){
          window._gaq.push=B._origGaqPush;
        }
      }else{
        try{
          delete window._gaq.push;
          log('✓ Restored _gaq.push to native');
        }catch(e){
          window._gaq.push=Array.prototype.push;
        }
      }
    }
    
    // IMPROVEMENT: Trigger consent granted event BEFORE loading scripts
    if(window.dataLayer&&Array.isArray(window.dataLayer)){
      try{
        window.dataLayer.push({
          'event':'consent_granted',
          'consent_type':'all'
        });
        log('✓ Pushed consent_granted to dataLayer');
      }catch(e){}
    }
    
    // Remove all blocked script tags from DOM
    var existingBlocked=document.querySelectorAll('script[data-consent-blocked="true"]');
    for(var k=0;k<existingBlocked.length;k++){
      try{
        existingBlocked[k].parentNode.removeChild(existingBlocked[k]);
      }catch(e){}
    }
    log('✓ Removed '+existingBlocked.length+' blocked script tags from DOM');
    
    // IMPROVEMENT: Prepare scripts to restore (both external and inline) - filter by consent category
    var toRestore=[];
    var seenUrls={};
    
    for(var j=0;j<B.blocked.length;j++){
      var b=B.blocked[j];
      if(b.tag==='script'&&hasConsentForTracker(b.src||'',b.code||'')){
        if(b.src&&!seenUrls[b.src]){
          toRestore.push({
            type:'external',
            src:b.src,
            parent:b.parent,
            next:b.next,
            async:b.async,
            defer:b.defer,
            attributes:b.attributes
          });
          seenUrls[b.src]=true;
        }else if(!b.src&&b.code){
          // IMPROVEMENT: Restore inline scripts too
          toRestore.push({
            type:'inline',
            code:b.code,
            parent:b.parent,
            next:b.next,
            attributes:b.attributes
          });
        }
      }
    }
    
    log('✓ Found '+toRestore.length+' script(s) to restore');
    
    var head=document.head||document.documentElement;
    var scriptsToLoad=toRestore.filter(function(s){return s.type==='external';}).length;
    var scriptsLoaded=0;
    var scriptsErrored=0;
    
    // IMPROVEMENT: Create a promise-based loader for better control
    var scriptPromises=[];
    
    // Load external scripts first
    for(var m=0;m<toRestore.length;m++){
      var r=toRestore[m];
      
      if(r.type==='external'){
        (function(scriptInfo){
          var promise=new Promise(function(resolve,reject){
            var el=document.createElement('script');
            el.src=scriptInfo.src;
            el.setAttribute('data-consent-restored','true');
            
            // IMPROVEMENT: Restore original attributes
            if(scriptInfo.attributes){
              for(var attr in scriptInfo.attributes){
                try{
                  el.setAttribute(attr,scriptInfo.attributes[attr]);
                }catch(e){}
              }
            }
            
            // IMPROVEMENT: Preserve async/defer behavior
            if(scriptInfo.async!==undefined)el.async=scriptInfo.async;
            if(scriptInfo.defer!==undefined)el.defer=scriptInfo.defer;
            
            el.onload=function(){
              scriptsLoaded++;
              log('✓ Loaded: '+scriptInfo.src+' ('+scriptsLoaded+'/'+scriptsToLoad+')');
              resolve();
            };
            
            el.onerror=function(){
              scriptsErrored++;
              log('✗ Error loading: '+scriptInfo.src);
              resolve(); // Still resolve to not block others
            };
            
            try{
              if(scriptInfo.parent&&scriptInfo.next&&
                 scriptInfo.parent.contains&&scriptInfo.parent.contains(scriptInfo.next)){
                scriptInfo.parent.insertBefore(el,scriptInfo.next);
              }else if(scriptInfo.parent&&scriptInfo.parent.appendChild){
                scriptInfo.parent.appendChild(el);
              }else{
                head.appendChild(el);
              }
            }catch(e){
              head.appendChild(el);
            }
          });
          
          scriptPromises.push(promise);
        })(r);
      }
    }
    
    // IMPROVEMENT: Wait for all external scripts to load, then execute inline scripts
    Promise.all(scriptPromises).then(function(){
      log('✓ All external scripts loaded ('+scriptsLoaded+' success, '+scriptsErrored+' errors)');
      
      // IMPROVEMENT: Now execute inline scripts
      for(var n=0;n<toRestore.length;n++){
        var r=toRestore[n];
        if(r.type==='inline'&&r.code){
          try{
            var inlineScript=document.createElement('script');
            inlineScript.setAttribute('data-consent-restored','true');
            
            if(r.attributes){
              for(var attr in r.attributes){
                try{
                  inlineScript.setAttribute(attr,r.attributes[attr]);
                }catch(e){}
              }
            }
            
            inlineScript.textContent=r.code;
            
            if(r.parent&&r.next&&r.parent.contains(r.next)){
              r.parent.insertBefore(inlineScript,r.next);
            }else if(r.parent){
              r.parent.appendChild(inlineScript);
            }else{
              head.appendChild(inlineScript);
            }
            
            log('✓ Executed inline script');
          }catch(e){
            log('✗ Error executing inline script: '+e.message);
          }
        }
      }
      
      // IMPROVEMENT: More aggressive tracker initialization with longer attempts
      setTimeout(function(){
        var attempts=0;
        var maxAttempts=50; // IMPROVEMENT: Increased from 25
        var checkInterval=100; // IMPROVEMENT: Check every 100ms
        
        var trackerStatus={
          fbq:false,
          gtag:false,
          ga:false,
          gtm:false
        };
        
        var attemptInterval=setInterval(function(){
          attempts++;
          var allReady=true;
          
          // Check and initialize GTM/dataLayer
          if(!trackerStatus.gtm&&window.dataLayer&&Array.isArray(window.dataLayer)){
            try{
              window.dataLayer.push({
                'event':'gtm.js',
                'gtm.start':Date.now()
              });
              window.dataLayer.push({
                'event':'consent_update',
                'consent_type':'all'
              });
              trackerStatus.gtm=true;
              log('✓ Initialized GTM/dataLayer');
            }catch(e){
              allReady=false;
            }
          }
          
          // Check and initialize gtag
          if(!trackerStatus.gtag&&window.gtag&&typeof window.gtag==='function'){
            try{
              window.gtag('js',new Date());
              // IMPROVEMENT: Trigger consent mode update
              window.gtag('consent','update',{
                'analytics_storage':'granted',
                'ad_storage':'granted',
                'ad_user_data':'granted',
                'ad_personalization':'granted'
              });
              trackerStatus.gtag=true;
              log('✓ Initialized gtag');
            }catch(e){
              allReady=false;
            }
          }
          
          // Check and initialize Facebook Pixel
          if(!trackerStatus.fbq&&window.fbq&&typeof window.fbq==='function'){
            try{
              // IMPROVEMENT: Check if it's the real fbq (not our stub)
              if(window.fbq.loaded===true||window.fbq.version==='2.9'||
                 (window.fbq.callMethod&&window.fbq.callMethod!==noop)){
                window.fbq('track','PageView');
                // IMPROVEMENT: Grant consent
                if(window.fbq.consent){
                  window.fbq('consent','grant');
                }
                trackerStatus.fbq=true;
                log('✓ Initialized fbq');
              }else{
                allReady=false;
              }
            }catch(e){
              allReady=false;
            }
          }
          
          // Check and initialize Google Analytics
          if(!trackerStatus.ga&&window.ga&&typeof window.ga==='function'){
            try{
              window.ga('send','pageview');
              trackerStatus.ga=true;
              log('✓ Initialized ga');
            }catch(e){
              allReady=false;
            }
          }
          
          // Stop if all trackers initialized or max attempts reached
          if(allReady||attempts>=maxAttempts){
            clearInterval(attemptInterval);
            log('✓ Tracker initialization complete (attempts: '+attempts+')');
            
            // IMPROVEMENT: Fire a custom event that trackers can listen to
            try{
              var event=new CustomEvent('consentflow_trackers_ready',{
                detail:{trackerStatus:trackerStatus}
              });
              window.dispatchEvent(event);
              log('✓ Dispatched consentflow_trackers_ready event');
            }catch(e){}
          }
        },checkInterval);
      },200); // IMPROVEMENT: Increased initial delay to 200ms
      
    }).catch(function(err){
      log('✗ Error in script loading: '+err.message);
    });
    
    B.blocked=[];
    log('✓ Enablement process started');
    
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

// Default branding text shown in banner when showBranding is true
const DEFAULT_BRANDING_TEXT = 'Powered by Cookie Access';

export function generateMainScript(siteId, allowedDomain, isPreview, config, bannerStyle, position, title, message, acceptText, rejectText, showReject, verifyCallbackUrl, trackUrl, consentLogUrl, templateStyle, showBranding = true) {
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
  const safeBranding = escapeForTemplate(DEFAULT_BRANDING_TEXT);
  
  return `
/* ======================================================
   CONSENT BANNER & DOMAIN VERIFICATION
====================================================== */

(function(){
var CONSENT_KEY='${CONSENT_KEY}';
var currentHost=location.hostname.toLowerCase().replace(/^www\\./,'');
var allowedHost='${allowedDomain || ''}'.toLowerCase().replace(/^www\\./,'');
var isPreview=${isPreview ? 'true' : 'false'};

if(!isPreview&&allowedHost&&currentHost!==allowedHost&&!currentHost.endsWith('.'+allowedHost)){
  console.error('[ConsentFlow] DOMAIN MISMATCH: Script configured for "'+allowedHost+'" but running on "'+currentHost+'". Banner disabled.');
  return;
}

function getConsentPrefs(){
  try{
    var c=localStorage.getItem(CONSENT_KEY);
    if(c==='accepted')return {accepted:true,analytics:true,marketing:true};
    if(c==='rejected')return {rejected:true,analytics:false,marketing:false};
    if(c&&c.charAt(0)==='{'){ try{ var o=JSON.parse(c); if(o&&typeof o==='object')return {analytics:!!o.analytics,marketing:!!o.marketing}; }catch(e){} }
  }catch(e){}
  return {analytics:false,marketing:false};
}

function hasConsent(){
  try{
    var c=localStorage.getItem(CONSENT_KEY);
    if(c==='accepted')return true;
    if(c==='rejected')return false;
    if(c&&c.charAt(0)==='{'){ try{ var o=JSON.parse(c); if(o&&typeof o==='object')return !!(o.analytics||o.marketing); }catch(e){} }
  }catch(e){}
  return false;
}

function setConsent(value){
  try{
    if(value==='accepted'){ window.__consentGiven=true; localStorage.setItem(CONSENT_KEY,'accepted'); }
    else if(value==='rejected'){ window.__consentGiven=false; localStorage.setItem(CONSENT_KEY,'rejected'); }
    else if(value&&typeof value==='object'){ window.__consentGiven=!!(value.analytics||value.marketing); localStorage.setItem(CONSENT_KEY,JSON.stringify({analytics:!!value.analytics,marketing:!!value.marketing})); }
    console.log('[ConsentFlow] Consent set to:',value);
  }catch(e){ console.error('[ConsentFlow] Failed to set consent:',e); }
}

function hasConsentChoice(){
  try{
    var c=localStorage.getItem(CONSENT_KEY);
    if(c==='accepted'||c==='rejected')return true;
    if(c&&c.charAt(0)==='{'){ try{ JSON.parse(c); return true; }catch(e){} }
  }catch(e){}
  return false;
}

var consentLogUrl='${(consentLogUrl || "").replace(/'/g, "\\'")}';
function sendConsentLog(status,categories){
  if(consentLogUrl){
    try{
      var body={status:status,pageUrl:location.href};
      if(categories&&typeof categories==='object')body.categories=categories;
      fetch(consentLogUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(function(){});
    }catch(e){}
  }
}

function showPreferencesModal(bannerEl){
  function updatePrefsToggles(el){
    var prefs=getConsentPrefs();
    var a=el.querySelector('#cf-pref-analytics'); var m_=el.querySelector('#cf-pref-marketing');
    if(a)a.checked=prefs.analytics; if(m_)m_.checked=prefs.marketing;
  }
  var m=document.getElementById('consentflow-prefs-modal');
  if(m){ m.style.display='flex'; updatePrefsToggles(m); return; }
  var prefs=getConsentPrefs();
  var templateStyleObj=${JSON.stringify(templateStyle || {})};
  var acceptBtnStyle='background:'+(templateStyleObj.buttonColor||'#22c55e')+';color:'+(templateStyleObj.buttonTextColor||'#fff')+';border:none;padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:14px;';
  var rejectBtnStyle='background:'+(templateStyleObj.buttonColor||'#ff0202')+';color:'+(templateStyleObj.buttonTextColor||'#fff')+';border:none;padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:14px;';
  var modal=document.createElement('div');
  modal.id='consentflow-prefs-modal';
  modal.style.cssText='display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2147483647;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';
  modal.innerHTML=
    '<div style="background:#fff;border-radius:12px;padding:24px;max-width:640px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0 0 8px 0;font-size:18px;color:#111;">Cookie preferences</h3><button id="cf-prefs-cancel" style="background:#e5e7eb;color:#374151;border:none;padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:14px;">X</button></div>'+
    '<p style="margin:0 0 16px 0;font-size:13px;color:#555;line-height:1.5;">We use cookies to enhance your experience, analyze traffic, and deliver relevant marketing. You can choose which categories you allow. Essential cookies are always enabled as they are required for the website to function properly.</p>'+
    '<p style="margin:0 0 16px 0;font-size:13px;color:#555;line-height:1.5;">We also use third-party cookies that help us analyse how you use this website, store your preferences, and provide the content and advertisements that are relevant to you. These cookies will only be stored in your browser with your prior consent.</p>'+
    '<div style="margin:16px 0;">'+
    '<label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;cursor:pointer;"><span style="font-size:14px;">Necessary</span> <p style="font-size:12px;color:#008000;">Always Active</p></label>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;"><small style="font-size:12px;color:#555;">Necessary cookies are required to enable the basic features of this site, such as providing secure log-in or adjusting your consent preferences. These cookies do not store any personally identifiable data.</small></label>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;cursor:pointer;"><span style="font-size:14px;">Analytics</span><input type="checkbox" id="cf-pref-analytics" style="width:18px;height:18px;cursor:pointer;"></label>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;"><small style="font-size:12px;color:#555;">Helps us understand how visitors interact with our website so we can improve performance and user experience.</small></label>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;cursor:pointer;"><span style="font-size:14px;">Marketing</span><input type="checkbox" id="cf-pref-marketing" style="width:18px;height:18px;cursor:pointer;"></label>'+
    '<label style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;"><small style="font-size:12px;color:#555;">Used to deliver relevant ads and measure advertising effectiveness across platforms.</small></label>'+
    '</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;">'+
    '<button id="cf-prefs-accept" style="'+acceptBtnStyle+'">${safeAccept || 'Accept All'}</button>'+
    (${showReject} ? '<button id="cf-prefs-reject" style="'+rejectBtnStyle+'">${safeReject || 'Reject All'}</button>' : '')+
    '<button id="cf-prefs-save" style="background:#3b82f6;color:#fff;border:none;padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:14px;">Save preferences</button>'+
    '</div></div>';
  modal.onclick=function(e){ if(e.target===modal){ modal.style.display='none'; } };
  document.body.appendChild(modal);
  updatePrefsToggles(modal);
  document.getElementById('cf-prefs-accept').onclick=function(){
    setConsent('accepted');
    sendConsentLog('accepted');
    modal.style.display='none';
    if(bannerEl&&bannerEl.parentNode)bannerEl.remove();
    try{ if(typeof showFloatingButton==='function')showFloatingButton(); }catch(e){}
    if(window.__enableConsentTrackers){ try{ window.__enableConsentTrackers(); }catch(e){} }
  };
  if(${showReject}){
    var rb=document.getElementById('cf-prefs-reject');
    if(rb)rb.onclick=function(){
      setConsent('rejected');
      sendConsentLog('rejected');
      modal.style.display='none';
      if(bannerEl&&bannerEl.parentNode)bannerEl.remove();
      try{ if(typeof showFloatingButton==='function')showFloatingButton(); }catch(e){}
    };
  }
  document.getElementById('cf-prefs-save').onclick=function(){
    var analytics=!!(document.getElementById('cf-pref-analytics')&&document.getElementById('cf-pref-analytics').checked);
    var marketing=!!(document.getElementById('cf-pref-marketing')&&document.getElementById('cf-pref-marketing').checked);
    setConsent({analytics:analytics,marketing:marketing});
    sendConsentLog('accepted',{analytics:analytics,marketing:marketing});
    modal.style.display='none';
    if(bannerEl&&bannerEl.parentNode)bannerEl.remove();
    try{ if(typeof showFloatingButton==='function')showFloatingButton(); }catch(e){}
    if((analytics||marketing)&&window.__enableConsentTrackers){ try{ window.__enableConsentTrackers(); }catch(e){} }
  };
  document.getElementById('cf-prefs-cancel').onclick=function(){ modal.style.display='none'; };
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
  
  // Skip tracking in preview mode
  var isPreview=${isPreview ? 'true' : 'false'};
  if(isPreview===true||isPreview==='true'){
    return;
  }
  
  var trackUrl='${trackUrl}';
  if(!trackUrl)return;
  
  try{
    var pagePath=location.pathname+location.search;
    var pageTitle=document.title||'';
    var userAgent=navigator.userAgent||'';
    var referer=document.referrer||'';
    
    fetch(trackUrl,{
      method:'POST',
      mode:'cors',
      credentials:'omit',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        pagePath:pagePath,
        pageTitle:pageTitle,
        userAgent:userAgent,
        referer:referer
      })
    }).catch(function(err){});
  }catch(e){}
})();

(function showBanner(){
  if(hasConsentChoice())return;
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
  var rejectBtnStyle='background:'+(templateStyleObj.buttonColor||'#ff0202')+';color:'+(templateStyleObj.buttonTextColor||'#fff')+';border:none;padding:10px 18px;font-weight:600;border-radius:6px;cursor:pointer;font-size:'+(templateStyleObj.fontSize||'14px')+';';
  var customizeBtnStyle='background:'+(templateStyleObj.backgroundColor||'#000')+';color:'+(templateStyleObj.buttonColor||'#fff')+';border:2px solid '+(templateStyleObj.buttonColor||'#fff')+';padding:10px 18px;text-decoration:none;font-weight:600;border-radius:6px;cursor:pointer;font-size:'+(templateStyleObj.fontSize||'14px')+';';
  
  banner.innerHTML=
    '<div style="flex:1;max-width:700px;">'+
    '<strong style="font-size:16px;display:block;margin-bottom:6px;">${safeTitle || 'We value your privacy'}</strong>'+
    '<p style="margin:0;font-size:14px;opacity:0.9;line-height:1.5;">${safeMessage || 'This site uses tracking cookies to enhance your browsing experience and analyze site traffic.'}</p>'+
    
    ${showBranding ? `'<p style="margin:8px 0 0 0;font-size:11px;opacity:0.7;">${safeBranding}</p>'+` : ''}
    '</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+
    '<a href="#" id="consentflow-manage-prefs" style="'+customizeBtnStyle+'">Customize</a>'+
    '<button id="consentflow-accept" style="'+acceptBtnStyle+'">${safeAccept || 'Accept All'}</button>'+
    ${showReject ? `'<button id="consentflow-reject" style="'+rejectBtnStyle+'">${safeReject || 'Reject All'}</button>'+` : ''}
    '</div>';
  
  document.body.appendChild(banner);
  
  var managePrefs=document.getElementById('consentflow-manage-prefs');
  if(managePrefs){ managePrefs.onclick=function(e){ e.preventDefault(); if(typeof showPreferencesModal==='function')showPreferencesModal(banner); }; }
  
  function maybeShowFloatingButton(){ try{ if(typeof showFloatingButton==='function')showFloatingButton(); }catch(e){} }
  document.getElementById('consentflow-accept').onclick=function(){
    setConsent('accepted');
    sendConsentLog('accepted');
    banner.remove();
    maybeShowFloatingButton();
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
      sendConsentLog('rejected');
      banner.remove();
      maybeShowFloatingButton();
      console.log('[ConsentFlow] User rejected consent');
    };
  }` : ''}
})();

function showFloatingButton(){
  if(!hasConsentChoice())return;
  if(document.getElementById('consentflow-float-btn'))return;
  if(!document.body){ setTimeout(showFloatingButton,50); return; }
  
  var templateStyleObj=${JSON.stringify(templateStyle || {})};
  var btnBg=templateStyleObj.backgroundColor||'#1f2937';
  var btnColor=templateStyleObj.textColor||'#ffffff';
  
  var floatBtn=document.createElement('button');
  floatBtn.id='consentflow-float-btn';
  floatBtn.setAttribute('aria-label','Manage cookie preferences');
  floatBtn.style.cssText='position:fixed;bottom:20px;left:20px;width:48px;height:48px;border-radius:50%;background:'+btnBg+';color:'+btnColor+';border:2px solid '+(btnColor||'rgba(255,255,255,0.5)')+';cursor:pointer;z-index:2147483646;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:22px;transition:transform 0.2s;';
  floatBtn.innerHTML='🍪';
  floatBtn.onmouseover=function(){ this.style.transform='scale(1.05)'; };
  floatBtn.onmouseout=function(){ this.style.transform='scale(1)'; };
  floatBtn.onclick=function(){ if(typeof showPreferencesModal==='function')showPreferencesModal(); };
  
  document.body.appendChild(floatBtn);
}
showFloatingButton();
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
    const isPreview = searchParams.get("preview") === "1";
    const configParam = searchParams.get("config");

    // Try to serve from CDN first (only for production, not preview with custom config)
    if (!isPreview || !configParam) {
      try {
        const cdnScript = await getScript(siteId, isPreview);
        if (cdnScript) {
          // Script found in CDN - serve it with proper cache headers
          return new Response(cdnScript, {
            status: 200,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": isPreview 
                ? "no-cache, no-store, must-revalidate" 
                : "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      } catch (cdnError) {
        // CDN error - fall through to dynamic generation
        console.log(`[Script API] CDN script not found for ${siteId}, generating dynamically`);
      }
    }

    // Fallback: Generate dynamically (for preview with custom config, or if CDN file missing)
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

    // SECURITY: Always use domain from database, never from query parameter
    // This prevents domain spoofing attacks where someone could use ?domain=malicious.com
    const allowedDomain = site.domain;
    
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

    let rawConfig = site.bannerConfig || DEFAULT_BANNER_CONFIG;
    if (typeof rawConfig === "string") {
      try {
        rawConfig = JSON.parse(rawConfig);
      } catch (e) {
        rawConfig = DEFAULT_BANNER_CONFIG;
      }
    }
    if (isPreview && configParam) {
      try {
        const decodedJson =
          typeof Buffer !== "undefined"
            ? Buffer.from(configParam, "base64").toString("utf-8")
            : decodeURIComponent(escape(atob(configParam)));
        const decoded = JSON.parse(decodedJson);
        if (decoded && typeof decoded === "object") {
          rawConfig = { ...rawConfig, ...decoded };
        }
      } catch (e) {
        console.warn("[Script API] Invalid preview config param:", e.message);
      }
    }
    const normalized = normalizeBannerConfig(rawConfig);
    const { title, message, acceptText, rejectText, showReject, position, style: normStyle } = normalized;
    const style = normStyle || {};
    const posStyle = position === "top" ? "top:0;bottom:auto;" : "bottom:0;top:auto;";
    const bannerStyle =
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

    const actualSiteId = siteId;
    const verifyCallbackUrl = `${baseUrl}/api/sites/${actualSiteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${actualSiteId}/track`;
    const consentLogUrl = `${baseUrl}/api/sites/${actualSiteId}/consent-log`;

    const showBranding = !site.subscription?.removeBrandingAddon;
    const inlineBlocker = generateInlineBlocker(siteId, allowedDomain, isPreview, consentApiHostname);
    const mainScript = generateMainScript(
      siteId,
      allowedDomain,
      isPreview,
      normalized,
      bannerStyle,
      position,
      title,
      message,
      acceptText,
      rejectText,
      showReject,
      verifyCallbackUrl,
      trackUrl,
      consentLogUrl,
      style,
      showBranding
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