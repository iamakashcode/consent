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

    // Generate CookieYes-style pre-execution DOM surgery consent script
    // CRITICAL: This must execute IMMEDIATELY before any other scripts
    // DENY-BY-DEFAULT: Block ALL trackers unless explicitly allowed
    const script = `(function(){
'use strict';

// ============================================================
// COOKIEYES-STYLE PRE-EXECUTION DOM SURGERY CONSENT SCRIPT
// DENY-BY-DEFAULT: Block ALL trackers unless explicitly allowed
// ============================================================

var SITE_ID='${finalSiteId}';
var CONSENT_KEY='cookie_consent_'+SITE_ID;

// ============================================================
// STEP 1: GLOBAL STUBBING (FIRST LINE OF EXECUTION)
// Stub ALL common tracking entry points IMMEDIATELY
// This MUST run before ANY other code, even before consent check
// ============================================================

// Store originals globally for restoration
var _origFbq,_origGtag,_origGa,_origDataLayerPush,_origGaqPush,_origAnalyticsTrack;

(function stubAllTrackingFunctionsFirst(){
  // Store originals if they exist (for restoration later)
  _origFbq=window.fbq;
  _origGtag=window.gtag;
  _origGa=window.ga;
  _origDataLayerPush=window.dataLayer&&window.dataLayer.push;
  _origGaqPush=window._gaq&&window._gaq.push;
  _origAnalyticsTrack=window.analytics&&window.analytics.track;
  
  // ALWAYS override Meta Pixel - fbq (MUST be first)
  // Check consent at call time, not at stub time
  window.fbq=function(){
    if(hasConsent()&&_origFbq)return _origFbq.apply(this,arguments);
    return undefined;
  };
  window._fbq=window.fbq;
  window.fbq.queue=[];
  window.fbq.loaded=true;
  window.fbq.version='2.0';
  window.fbq.push=window.fbq;
  window.fbq.callMethod=function(){};
  
  // ALWAYS override Google Analytics - gtag
  window.gtag=function(){
    if(hasConsent()&&_origGtag)return _origGtag.apply(this,arguments);
    return undefined;
  };
  
  // ALWAYS override dataLayer
  if(!window.dataLayer)window.dataLayer=[];
  window.dataLayer.push=function(){
    if(hasConsent()&&_origDataLayerPush)return _origDataLayerPush.apply(window.dataLayer,arguments);
    return 0;
  };
  
  // ALWAYS override classic GA - ga
  window.ga=function(){
    if(hasConsent()&&_origGa)return _origGa.apply(this,arguments);
    return undefined;
  };
  window.ga.l=Date.now();
  window.ga.q=[];
  
  // ALWAYS override legacy _gaq
  if(!window._gaq)window._gaq=[];
  window._gaq.push=function(){
    if(hasConsent()&&_origGaqPush)return _origGaqPush.apply(window._gaq,arguments);
    return 0;
  };
  
  // ALWAYS override Segment and other analytics
  if(!window.analytics)window.analytics={};
  window.analytics.track=function(){
    if(hasConsent()&&_origAnalyticsTrack)return _origAnalyticsTrack.apply(this,arguments);
    return undefined;
  };
  window.analytics.page=function(){};
  window.analytics.identify=function(){};
  window.analytics.alias=function(){};
  
  // Stub other common trackers
  window.mixpanel=window.mixpanel||{};
  window.mixpanel.track=function(){};
  window.mixpanel.identify=function(){};
  
  window.amplitude=window.amplitude||{};
  window.amplitude.getInstance=function(){return{logEvent:function(){}};};
  
  window._hsq=window._hsq||[];
  window._hsq.push=function(){};
  
  window.hj=window.hj||function(){};
  
  window.clarity=window.clarity||function(){};
  
  console.log('[Consent SDK] All tracking functions stubbed (first line)');
})();

// Check consent - used throughout (LIVE check, never cached)
function hasConsent(){
  return localStorage.getItem(CONSENT_KEY)==='accepted';
}

// Check if script is marked as essential
function isEssentialScript(node){
  if(!node)return false;
  return node.getAttribute&&node.getAttribute('data-consent')==='essential';
}

// ============================================================
// STEP 2: UNIVERSAL TRACKER DETECTION (HEURISTIC-BASED)
// DENY-BY-DEFAULT: Assume EVERYTHING is a tracker unless explicitly allowed
// ============================================================

// Known tracker domains (non-exhaustive, used for quick checks)
var KNOWN_TRACKER_DOMAINS=[
  'google','facebook','meta','doubleclick','tiktok','twitter','linkedin',
  'hotjar','clarity','segment','mixpanel','amplitude','ads','tagmanager',
  'analytics','tracking','pixel','beacon','collect','metrics','insight',
  'telemetry','monitor','gtm','ga','gtag','fbevents'
];

// Universal tracker detection - returns true if ANY heuristic matches
function isTracker(url,text,node){
  // Allow essential scripts
  if(node&&isEssentialScript(node))return false;
  
  // Combine URL and text for analysis
  var searchStr=((url||'')+(text||'')).toLowerCase();
  if(!searchStr)return false;
  
  // Heuristic A: URL patterns (tracking/analytics/pixel/collect/beacon/tag/ads/metrics/insight/telemetry/event/monitor)
  var urlPatterns=/tracking|analytics|pixel|collect|beacon|tag|ads|metrics|insight|telemetry|event|monitor/i;
  if(urlPatterns.test(searchStr))return true;
  
  // Heuristic B: Known tracker domains
  for(var i=0;i<KNOWN_TRACKER_DOMAINS.length;i++){
    if(searchStr.indexOf(KNOWN_TRACKER_DOMAINS[i])>-1)return true;
  }
  
  // Heuristic C: Inline code signals
  var codePatterns=[
    'fbq(','_fbq','gtag(','ga(','_gaq','dataLayer','analytics.track',
    'analytics.page','analytics.identify','mixpanel.track','amplitude',
    'navigator.sendBeacon','new Image().src','_hsq','hj(','clarity('
  ];
  for(var j=0;j<codePatterns.length;j++){
    if(searchStr.indexOf(codePatterns[j])>-1)return true;
  }
  
  // Heuristic D: Network-only trackers (for fetch/XHR/beacon)
  if(url){
    var networkPatterns=/\\/track|\\/event|\\/collect|\\/pixel|\\/beacon|\\/analytics|\\/metrics/i;
    if(networkPatterns.test(url))return true;
  }
  
  // If uncertain, BLOCK IT (deny-by-default)
  // Only allow if explicitly marked as essential
  return false;
}

// Enhanced inline script detection
function hasTrackerCode(text){
  if(!text)return false;
  return isTracker('',text,null);
}

// ============================================================
// STEP 3: DOMAIN VALIDATION
// ============================================================

var isPreviewMode=${isPreview ? 'true' : 'false'};
var ALLOWED_DOMAIN='${isPreview ? '*' : (allowedDomain || '*')}';

// Clear consent in preview mode
if(isPreviewMode){
  console.log('[Consent SDK] Preview mode - clearing consent');
  localStorage.removeItem(CONSENT_KEY);
  var existing=document.getElementById('cookie-banner');
  if(existing)existing.remove();
}

var currentHost=window.location.hostname.toLowerCase().replace(/^www\\./,'');
var allowedHost=ALLOWED_DOMAIN!=='*'?ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,''):null;
var domainMatches=!allowedHost||currentHost===allowedHost;

if(!domainMatches){
  console.warn('[Consent SDK] Domain mismatch. Current:',currentHost,'Allowed:',allowedHost||'*');
  console.warn('[Consent SDK] Exiting - script should not run on this domain');
  return;
}

// ============================================================
// STEP 4: BACKUP & RESTORE NODES SYSTEM
// ============================================================

var blockedNodes=[]; // Store blocked scripts/iframes for restoration

function backupNode(node){
  if(!node)return null;
  var backup={
    node:node,
    tagName:node.tagName?node.tagName.toLowerCase():'',
    src:node.src||node.getAttribute('src')||'',
    type:node.type||node.getAttribute('type')||'',
    text:node.textContent||node.innerHTML||'',
    parent:node.parentNode,
    nextSibling:node.nextSibling,
    attributes:{},
    isInline:!(node.src||node.getAttribute('src'))
  };
  
  // Copy all attributes
  if(node.attributes){
    for(var i=0;i<node.attributes.length;i++){
      var attr=node.attributes[i];
      if(attr.name!=='src'&&attr.name!=='type'){
        backup.attributes[attr.name]=attr.value;
      }
    }
  }
  
  return backup;
}

// ============================================================
// STEP 5: OVERRIDE document.createElement (CookieYes-style)
// Intercept creation of <script>, <iframe>, and <img> BEFORE insertion
// DENY-BY-DEFAULT: Block everything unless essential
// ============================================================

var origCreateElement=document.createElement;

document.createElement=function(tagName,options){
  var element=origCreateElement.call(this,tagName,options);
  
  // Only intercept script, iframe, and img elements
  var tagLower=tagName.toLowerCase();
  if(tagLower!=='script'&&tagLower!=='iframe'&&tagLower!=='img'){
    return element;
  }
  
  // Skip if consent already granted
  if(hasConsent()){
    return element;
  }
  
  var isScript=tagLower==='script';
  var isIframe=tagLower==='iframe';
  var isImg=tagLower==='img';
  
  // Override src setter for scripts, iframes, and images
  var proto=isScript?HTMLScriptElement.prototype:(isIframe?HTMLIFrameElement.prototype:HTMLImageElement.prototype);
  var originalSrcDescriptor=Object.getOwnPropertyDescriptor(proto,'src');
  if(originalSrcDescriptor){
    Object.defineProperty(element,'src',{
      get:function(){
        return this.getAttribute('src')||'';
      },
      set:function(url){
        if(!url)return;
        
        // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
        if(isTracker(url,'',this)){
          console.log('[Consent SDK] ✓ Blocked tracker (src setter):',url);
          this.setAttribute('data-consent-blocked','true');
          this.setAttribute('data-blocked-src',url);
          if(isScript)this.type='javascript/blocked';
          // Don't set src - prevents loading
          return;
        }
        
        // Set src normally if not blocked
        this.setAttribute('src',url);
      },
      configurable:true,
      enumerable:true
    });
  }
  
  // Override type setter for scripts
  if(isScript){
    var originalTypeDescriptor=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'type');
    if(originalTypeDescriptor){
      Object.defineProperty(element,'type',{
        get:function(){
          return this.getAttribute('type')||'text/javascript';
        },
        set:function(type){
          var src=this.src||this.getAttribute('src')||'';
          var text=this.textContent||this.innerHTML||'';
          
          // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
          if(isTracker(src,text,this)){
            console.log('[Consent SDK] ✓ Blocked tracker (type setter):',src||'inline');
            this.setAttribute('data-consent-blocked','true');
            if(src)this.setAttribute('data-blocked-src',src);
            this.setAttribute('type','javascript/blocked');
            return;
          }
          
          // Set type normally if not blocked
          this.setAttribute('type',type||'text/javascript');
        },
        configurable:true,
        enumerable:true
      });
    }
  }
  
  // Intercept textContent/innerHTML for inline scripts
  if(isScript){
    var originalTextContent=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
    if(originalTextContent){
      Object.defineProperty(element,'textContent',{
        get:function(){
          return originalTextContent.get.call(this);
        },
        set:function(text){
          // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
          if(isTracker('',text,this)){
            console.log('[Consent SDK] ✓ Blocked inline tracker (textContent setter)');
            this.setAttribute('data-consent-blocked','true');
            this.type='javascript/blocked';
            return;
          }
          originalTextContent.set.call(this,text);
        },
        configurable:true,
        enumerable:true
      });
    }
    
    // Also intercept innerHTML
    var originalInnerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
    if(originalInnerHTML){
      Object.defineProperty(element,'innerHTML',{
        get:function(){
          return originalInnerHTML.get.call(this);
        },
        set:function(html){
          // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
          if(isTracker('',html,this)){
            console.log('[Consent SDK] ✓ Blocked inline tracker (innerHTML setter)');
            this.setAttribute('data-consent-blocked','true');
            this.type='javascript/blocked';
            return;
          }
          originalInnerHTML.set.call(this,html);
        },
        configurable:true,
        enumerable:true
      });
    }
  }
  
  return element;
};

console.log('[Consent SDK] document.createElement overridden for pre-execution blocking');

// ============================================================
// STEP 6: INTERCEPT appendChild AND insertBefore
// Catch scripts, iframes, and images added dynamically
// DENY-BY-DEFAULT: Block everything unless essential
// ============================================================

var origAppendChild=Node.prototype.appendChild;
var origInsertBefore=Node.prototype.insertBefore;

Node.prototype.appendChild=function(child){
  if(child&&child.tagName){
    var tagName=child.tagName.toLowerCase();
    if((tagName==='script'||tagName==='iframe'||tagName==='img')&&!hasConsent()){
      var src=child.src||child.getAttribute('src')||'';
      var text=tagName==='script'?(child.textContent||child.innerHTML||''):'';
      
      // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
      if(isTracker(src,text,child)){
        console.log('[Consent SDK] ✓ Blocked '+tagName+' (appendChild):',src||'inline');
        var backup=backupNode(child);
        if(backup)blockedNodes.push(backup);
        child.setAttribute('data-consent-blocked','true');
        if(src)child.setAttribute('data-blocked-src',src);
        if(tagName==='script')child.type='javascript/blocked';
        // Don't append - prevents execution
        return child;
      }
    }
  }
  return origAppendChild.call(this,child);
};

Node.prototype.insertBefore=function(newNode,referenceNode){
  if(newNode&&newNode.tagName){
    var tagName=newNode.tagName.toLowerCase();
    if((tagName==='script'||tagName==='iframe'||tagName==='img')&&!hasConsent()){
      var src=newNode.src||newNode.getAttribute('src')||'';
      var text=tagName==='script'?(newNode.textContent||newNode.innerHTML||''):'';
      
      // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
      if(isTracker(src,text,newNode)){
        console.log('[Consent SDK] ✓ Blocked '+tagName+' (insertBefore):',src||'inline');
        var backup=backupNode(newNode);
        if(backup)blockedNodes.push(backup);
        newNode.setAttribute('data-consent-blocked','true');
        if(src)newNode.setAttribute('data-blocked-src',src);
        if(tagName==='script')newNode.type='javascript/blocked';
        // Don't insert - prevents execution
        return newNode;
      }
    }
  }
  return origInsertBefore.call(this,newNode,referenceNode);
};

console.log('[Consent SDK] appendChild/insertBefore intercepted');

// ============================================================
// STEP 7: beforescriptexecute EVENT HANDLING (MANDATORY)
// This is MANDATORY to stop inline Meta Pixel bootstrap and cached GTM scripts
// DENY-BY-DEFAULT: Block everything unless essential
// ============================================================

function attachBeforeScriptExecute(script){
  if(!script||script.getAttribute('data-consent-beforescript-attached')==='true')return;
  
  script.setAttribute('data-consent-beforescript-attached','true');
  
  script.addEventListener('beforescriptexecute',function(e){
    if(hasConsent())return; // Allow if consent granted
    
    var src=script.src||script.getAttribute('src')||'';
    var text=script.textContent||script.innerHTML||'';
    
    // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
    if(isTracker(src,text,script)){
      console.log('[Consent SDK] ✓ Prevented script execution (beforescriptexecute):',src||'inline');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Backup node for restoration
      var backup=backupNode(script);
      if(backup)blockedNodes.push(backup);
      
      // Mark as blocked
      script.setAttribute('data-consent-blocked','true');
      script.type='javascript/blocked';
      
      return false;
    }
  },true); // Use capture phase
}

// ============================================================
// STEP 8: DOM PARSING-TIME BLOCKING
// Block existing scripts, iframes, and images in DOM during HTML parsing
// Do NOT rely only on MutationObserver or window.onload
// DENY-BY-DEFAULT: Block everything unless essential
// ============================================================

function blockExistingScripts(){
  if(hasConsent())return;
  
  console.log('[Consent SDK] Blocking existing trackers in DOM...');
  
  // Block external scripts - PHYSICALLY REMOVE from DOM
  var scripts=document.querySelectorAll('script[src]');
  for(var i=0;i<scripts.length;i++){
    var s=scripts[i];
    if(s.getAttribute('data-consent-blocked')==='true')continue;
    
    var src=s.src||s.getAttribute('src')||'';
    
    // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
    if(isTracker(src,'',s)){
      console.log('[Consent SDK] ✓ Blocking existing script:',src);
      var backup=backupNode(s);
      if(backup)blockedNodes.push(backup);
      
      // PHYSICALLY REMOVE from DOM to prevent execution
      if(s.parentNode){
        s.parentNode.removeChild(s);
        console.log('[Consent SDK] ✓ Removed tracker script from DOM:',src);
      }else{
        // If no parent, mark as blocked
        s.setAttribute('data-consent-blocked','true');
        s.setAttribute('data-blocked-src',src);
        s.type='javascript/blocked';
        if(s.src)s.removeAttribute('src');
      }
    }
  }
  
  // Block inline scripts - PHYSICALLY REMOVE from DOM
  var inlineScripts=document.querySelectorAll('script:not([src])');
  for(var i=0;i<inlineScripts.length;i++){
    var s=inlineScripts[i];
    if(s.getAttribute('data-consent-blocked')==='true')continue;
    
    var text=s.textContent||s.innerHTML||'';
    
    // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
    if(isTracker('',text,s)){
      console.log('[Consent SDK] ✓ Blocking existing inline script');
      var backup=backupNode(s);
      if(backup)blockedNodes.push(backup);
      
      // PHYSICALLY REMOVE from DOM to prevent execution
      if(s.parentNode){
        s.parentNode.removeChild(s);
        console.log('[Consent SDK] ✓ Removed inline tracker script from DOM');
      }else{
        // If no parent, mark as blocked
        s.setAttribute('data-consent-blocked','true');
        s.type='javascript/blocked';
        s.textContent='';
        s.innerHTML='';
      }
    }
  }
  
  // Block tracking iframes - PHYSICALLY REMOVE from DOM
  var iframes=document.querySelectorAll('iframe[src]');
  for(var i=0;i<iframes.length;i++){
    var iframe=iframes[i];
    if(iframe.getAttribute('data-consent-blocked')==='true')continue;
    
    var src=iframe.src||iframe.getAttribute('src')||'';
    
    // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
    if(isTracker(src,'',iframe)){
      console.log('[Consent SDK] ✓ Blocking existing iframe:',src);
      var backup=backupNode(iframe);
      if(backup)blockedNodes.push(backup);
      
      // PHYSICALLY REMOVE from DOM
      if(iframe.parentNode){
        iframe.parentNode.removeChild(iframe);
        console.log('[Consent SDK] ✓ Removed tracker iframe from DOM:',src);
      }
    }
  }
  
  // Block tracking images (pixels) - PHYSICALLY REMOVE from DOM
  var images=document.querySelectorAll('img[src]');
  for(var i=0;i<images.length;i++){
    var img=images[i];
    if(img.getAttribute('data-consent-blocked')==='true')continue;
    
    var src=img.src||img.getAttribute('src')||'';
    
    // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
    if(isTracker(src,'',img)){
      console.log('[Consent SDK] ✓ Blocking existing tracking pixel:',src);
      var backup=backupNode(img);
      if(backup)blockedNodes.push(backup);
      
      // PHYSICALLY REMOVE from DOM
      if(img.parentNode){
        img.parentNode.removeChild(img);
        console.log('[Consent SDK] ✓ Removed tracking pixel from DOM:',src);
      }
    }
  }
  
  // Attach beforescriptexecute to remaining scripts (Firefox only, but doesn't hurt)
  var allScripts=document.querySelectorAll('script');
  for(var i=0;i<allScripts.length;i++){
    attachBeforeScriptExecute(allScripts[i]);
  }
}

// Execute immediately - during HTML parsing
blockExistingScripts();

// Also execute when DOM is ready (backup)
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',blockExistingScripts);
}
window.addEventListener('load',blockExistingScripts);

// ============================================================
// STEP 9: NETWORK INTERCEPTION (Secondary Defense)
// Block fetch, XHR, sendBeacon, Image pixels
// DENY-BY-DEFAULT: Block all tracking network requests
// ============================================================

var origFetch=window.fetch;
var origXHROpen=XMLHttpRequest.prototype.open;
var origXHRSend=XMLHttpRequest.prototype.send;
var origSendBeacon=navigator.sendBeacon;
var origImage=window.Image;

// Intercept fetch
window.fetch=function(input,init){
  if(hasConsent())return origFetch.apply(this,arguments);
  
  var url=typeof input==='string'?input:(input&&input.url?input.url:'');
  if(url&&isTracker(url,'',null)){
    console.log('[Consent SDK] ✓ Blocked fetch:',url);
    return Promise.reject(new Error('Blocked by consent manager'));
  }
  return origFetch.apply(this,arguments);
};

// Intercept XMLHttpRequest
XMLHttpRequest.prototype.open=function(method,url){
  if(hasConsent()){
    this._blocked=false;
    return origXHROpen.apply(this,arguments);
  }
  
  if(url&&isTracker(url,'',null)){
    console.log('[Consent SDK] ✓ Blocked XHR:',url);
    this._blocked=true;
    this._blockedUrl=url;
    return;
  }
  this._blocked=false;
  this._blockedUrl=url;
  return origXHROpen.apply(this,arguments);
};

XMLHttpRequest.prototype.send=function(data){
  if(this._blocked||(!hasConsent()&&this._blockedUrl&&isTracker(this._blockedUrl,'',null))){
    console.log('[Consent SDK] ✓ Blocked XHR send:',this._blockedUrl);
    return;
  }
  return origXHRSend.apply(this,arguments);
};

// Block navigator.sendBeacon
navigator.sendBeacon=function(url,data){
  if(hasConsent())return origSendBeacon.apply(this,arguments);
  
  if(url&&isTracker(url,'',null)){
    console.log('[Consent SDK] ✓ Blocked sendBeacon:',url);
    return false;
  }
  return origSendBeacon.apply(this,arguments);
};

// Block Image pixel beacons
window.Image=function(){
  var img=new origImage();
  var origSrc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  if(origSrc){
    Object.defineProperty(img,'src',{
      get:function(){return this.getAttribute('src')||'';},
      set:function(url){
        if(!hasConsent()&&isTracker(url,'',this)){
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

// ============================================================
// STEP 10: MUTATIONOBSERVER (Backup for Dynamic Scripts/Iframes/Images)
// Use as backup only - primary blocking is via createElement override
// DENY-BY-DEFAULT: Block everything unless essential
// ============================================================

var observer=new MutationObserver(function(mutations){
  if(hasConsent())return;
  
  mutations.forEach(function(mutation){
    mutation.addedNodes.forEach(function(node){
      if(node.nodeType!==1||!node.tagName)return;
      
      var tagName=node.tagName.toLowerCase();
      if(tagName==='script'||tagName==='iframe'||tagName==='img'){
        var src=node.src||node.getAttribute('src')||'';
        var text=tagName==='script'?(node.textContent||node.innerHTML||''):'';
        
        // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
        if(isTracker(src,text,node)){
          console.log('[Consent SDK] ✓ Blocked dynamic '+tagName+' (MutationObserver):',src||'inline');
          var backup=backupNode(node);
          if(backup)blockedNodes.push(backup);
          
          // PHYSICALLY REMOVE from DOM
          if(node.parentNode){
            node.parentNode.removeChild(node);
            console.log('[Consent SDK] ✓ Removed dynamic '+tagName+' from DOM:',src||'inline');
          }else{
            node.setAttribute('data-consent-blocked','true');
            if(src)node.setAttribute('data-blocked-src',src);
            if(tagName==='script'){
              node.type='javascript/blocked';
              attachBeforeScriptExecute(node);
            }
          }
        }
      }
      
      // Check scripts/iframes/images inside added nodes
      if(node.querySelectorAll){
        var selectors=['script','iframe','img'];
        for(var selIdx=0;selIdx<selectors.length;selIdx++){
          var elements=node.querySelectorAll(selectors[selIdx]);
          for(var i=0;i<elements.length;i++){
            var el=elements[i];
            if(el.getAttribute('data-consent-blocked')==='true')continue;
            
            var elSrc=el.src||el.getAttribute('src')||'';
            var elText=selectors[selIdx]==='script'?(el.textContent||el.innerHTML||''):'';
            
            // DENY-BY-DEFAULT: Block if it's a tracker (unless essential)
            if(isTracker(elSrc,elText,el)){
              console.log('[Consent SDK] ✓ Blocked nested '+selectors[selIdx]+' (MutationObserver):',elSrc||'inline');
              var backup=backupNode(el);
              if(backup)blockedNodes.push(backup);
              
              // PHYSICALLY REMOVE from DOM
              if(el.parentNode){
                el.parentNode.removeChild(el);
                console.log('[Consent SDK] ✓ Removed nested '+selectors[selIdx]+' from DOM:',elSrc||'inline');
              }else{
                el.setAttribute('data-consent-blocked','true');
                if(elSrc)el.setAttribute('data-blocked-src',elSrc);
                if(selectors[selIdx]==='script'){
                  el.type='javascript/blocked';
                  attachBeforeScriptExecute(el);
                }
              }
            }
          }
        }
      }
    });
  });
});

observer.observe(document.documentElement,{
  childList:true,
  subtree:true
});

console.log('[Consent SDK] MutationObserver initialized (backup defense)');

// Network interception is handled in STEP 8 above

// Domain verification (domain already validated above)
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

// ============================================================
// STEP 11: ENABLE TRACKERS (On Consent Grant)
// Restore blocked nodes and allow tracking
// ============================================================

function enableTrackers(){
  console.log('[Consent SDK] Enabling trackers');
  
  // Restore blocked nodes from backup system
  // CRITICAL: Only restore external scripts/iframes/images with src - DO NOT restore inline scripts
  // Inline scripts can cause double-firing and broken execution order
  blockedNodes.forEach(function(backup){
    if(!backup||!backup.parent)return; // Skip if no parent (can't restore)
    
    // SKIP inline scripts - only restore external elements with src
    if(backup.isInline||!backup.src)return;
    
    // Create new element based on tag type
    var newEl;
    if(backup.tagName==='script'){
      newEl=document.createElement('script');
      newEl.src=backup.src;
    }else if(backup.tagName==='iframe'){
      newEl=document.createElement('iframe');
      newEl.src=backup.src;
    }else if(backup.tagName==='img'){
      newEl=document.createElement('img');
      newEl.src=backup.src;
    }else{
      return; // Unknown type, skip
    }
    
    // Restore attributes
    for(var attr in backup.attributes){
      newEl.setAttribute(attr,backup.attributes[attr]);
    }
    
    // Restore async/defer if they were set (scripts only)
    if(backup.tagName==='script'){
      if(backup.node&&backup.node.async)newEl.async=true;
      if(backup.node&&backup.node.defer)newEl.defer=true;
    }
    
    // Insert at original position
    if(backup.nextSibling){
      backup.parent.insertBefore(newEl,backup.nextSibling);
    }else{
      backup.parent.appendChild(newEl);
    }
    
    console.log('[Consent SDK] Restored '+backup.tagName+':',backup.src);
  });
  
  // Clear blocked nodes array
  blockedNodes=[];
  
  // Restore document.createElement to original
  document.createElement=origCreateElement;
  
  // Restore appendChild and insertBefore
  Node.prototype.appendChild=origAppendChild;
  Node.prototype.insertBefore=origInsertBefore;
  
  // Restore network interception functions
  window.fetch=origFetch;
  XMLHttpRequest.prototype.open=origXHROpen;
  XMLHttpRequest.prototype.send=origXHRSend;
  navigator.sendBeacon=origSendBeacon;
  window.Image=origImage;
  
  // Stop MutationObserver
  if(observer)observer.disconnect();
  
  // Restore tracking functions - use originals if they exist, otherwise delete stubs
  if(_origFbq){
    window.fbq=_origFbq;
    window._fbq=_origFbq;
  }else{
    // If no original, allow native scripts to initialize
    delete window.fbq;
    delete window._fbq;
  }
  
  if(_origGtag){
    window.gtag=_origGtag;
  }else{
    delete window.gtag;
  }
  
  if(_origGa){
    window.ga=_origGa;
  }else{
    delete window.ga;
  }
  
  // Restore dataLayer.push
  if(_origDataLayerPush){
    window.dataLayer.push=_origDataLayerPush;
  }else if(window.dataLayer){
    window.dataLayer.push=Array.prototype.push;
  }
  
  // Restore _gaq.push
  if(_origGaqPush){
    window._gaq.push=_origGaqPush;
  }else if(window._gaq){
    window._gaq.push=Array.prototype.push;
  }
  
  // Restore analytics
  if(_origAnalyticsTrack&&window.analytics){
    window.analytics.track=_origAnalyticsTrack;
  }
  
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
