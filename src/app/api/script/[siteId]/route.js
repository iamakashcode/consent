import { prisma } from "@/lib/prisma";
import { DEFAULT_BANNER_CONFIG, BANNER_TEMPLATES } from "@/lib/banner-templates";
import { hasVerificationColumns } from "@/lib/db-utils";
import { isSubscriptionActive } from "@/lib/subscription";

export async function GET(req, { params }) {
  try {
    // Await params as it's a Promise in Next.js
    const resolvedParams = await params;
    const { siteId } = resolvedParams || {};
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");
    const isPreview = searchParams.get("preview") === "1";
    const previewConfigParam = searchParams.get("config");

    // Always try to get domain from query param first (most reliable)
    let domain = domainParam || "";
    
    // If no domain param, try to get from database
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

          // If verification columns exist, use them; else fallback to bannerConfig._verification
          if (verificationColumns.allExist) {
            siteVerified = site.isVerified || false;
          } else {
            const v = site?.bannerConfig?._verification;
            siteVerified = (v && v.isVerified) || false;
          }

          allowedDomain = site.domain;
        }
      } catch (error) {
        // If schema mismatch happens, fallback to bannerConfig only
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
    
    // If still no domain, try to decode from siteId
    if (!domain && siteId) {
      try {
        const decoded = Buffer.from(siteId, "base64").toString("utf-8");
        if (decoded && !decoded.includes("-")) {
          domain = decoded;
        }
      } catch (e) {
        // Ignore decode errors
      }
    }
    
    // Fallback: use wildcard if no domain found
    if (!domain) {
      domain = "*";
    }

    // Check subscription status for this site - block script if subscription is inactive
    if (siteId && !isPreview) {
      let subscriptionStatus = await isSubscriptionActive(siteId);
      
      // If subscription is pending and has a Paddle transaction/subscription ID, try to sync
      if (!subscriptionStatus.isActive && subscriptionStatus.subscription?.status === "pending" && 
          (subscriptionStatus.subscription?.paddleTransactionId || subscriptionStatus.subscription?.paddleSubscriptionId)) {
        console.log(`[Script] Subscription is pending, attempting to sync from Paddle for site ${siteId}`);
        
        try {
          // Try to sync subscription status from Paddle
          const syncSubscriptionId = subscriptionStatus.subscription.paddleSubscriptionId || subscriptionStatus.subscription.paddleTransactionId;
          if (syncSubscriptionId) {
            // Import sync function
            const { fetchPaddleSubscription } = await import("@/lib/paddle");
            const { startUserTrial } = await import("@/lib/subscription");
            
            try {
              // Fetch from Paddle
              const paddleSub = await fetchPaddleSubscription(syncSubscriptionId);
              
              if (paddleSub) {
                // Update subscription status based on Paddle status
                const paddleStatus = paddleSub.status;
                let newStatus = subscriptionStatus.subscription.status;
                
                if (paddleStatus === "active" || paddleStatus === "trialing") {
                  // Get site to access user
                  const site = await prisma.site.findUnique({
                    where: { id: subscriptionStatus.subscription.siteId },
                    include: { user: true },
                  });
                  
                  if (site) {
                    // Start user trial if needed
                    await startUserTrial(site.userId);
                    
                    // Update subscription
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
                    
                    // Re-check subscription status
                    subscriptionStatus = await isSubscriptionActive(siteId);
                    console.log(`[Script] Synced subscription, new status: ${subscriptionStatus.isActive ? 'active' : 'inactive'}`);
                  }
                }
              }
            } catch (syncError) {
              console.warn(`[Script] Could not sync subscription from Paddle:`, syncError.message);
              // Continue with original status check
            }
          }
        } catch (error) {
          console.warn(`[Script] Error during subscription sync:`, error.message);
          // Continue with original status check
        }
      }
      
      if (!subscriptionStatus.isActive) {
        console.warn(`[Script] Subscription inactive for site ${siteId}: ${subscriptionStatus.reason}`);
        // Return a blocked script that shows a message
        const blockedScript = `(function(){
console.error('[Consent SDK] Access denied: Subscription inactive for this domain. ${subscriptionStatus.reason}');
if(typeof window!=='undefined'&&window.console){
window.console.error('[Consent SDK] Please renew your subscription for this domain to continue using the consent script.');
}
})();`;
        return new Response(blockedScript, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
      
      // Check page view limit
      const { checkPageViewLimit } = await import("@/lib/subscription");
      const pageViewCheck = await checkPageViewLimit(siteId);
      if (pageViewCheck.exceeded && pageViewCheck.limit !== Infinity) {
        console.warn(`[Script] Page view limit exceeded for site ${siteId}: ${pageViewCheck.currentViews}/${pageViewCheck.limit}`);
        const blockedScript = `(function(){
console.error('[Consent SDK] Access denied: Page view limit exceeded. Current: ${pageViewCheck.currentViews}, Limit: ${pageViewCheck.limit}');
if(typeof window!=='undefined'&&window.console){
window.console.error('[Consent SDK] Please upgrade your plan to continue using the consent script.');
}
})();`;
        return new Response(blockedScript, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }
    
    // Generate siteId for consent key (use provided siteId or generate from domain)
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

    // Prepare banner configuration for script
    // Ensure bannerConfig has all required fields
    const bannerConfigForScript = {
      template: effectiveConfig.template || DEFAULT_BANNER_CONFIG.template,
      position: effectiveConfig.position || DEFAULT_BANNER_CONFIG.position,
      title: effectiveConfig.title || DEFAULT_BANNER_CONFIG.title,
      message: effectiveConfig.message || effectiveConfig.description || DEFAULT_BANNER_CONFIG.message,
      acceptButtonText: effectiveConfig.acceptButtonText || effectiveConfig.acceptText || DEFAULT_BANNER_CONFIG.acceptButtonText,
      rejectButtonText: effectiveConfig.rejectButtonText || effectiveConfig.rejectText || DEFAULT_BANNER_CONFIG.rejectButtonText,
      customizeButtonText: effectiveConfig.customizeButtonText || effectiveConfig.customizeText || DEFAULT_BANNER_CONFIG.customizeButtonText || "Customize",
      showRejectButton: effectiveConfig.showRejectButton !== undefined ? effectiveConfig.showRejectButton : DEFAULT_BANNER_CONFIG.showRejectButton,
      showCustomizeButton: effectiveConfig.showCustomizeButton !== undefined ? effectiveConfig.showCustomizeButton : DEFAULT_BANNER_CONFIG.showCustomizeButton,
    };
    const templateKey = bannerConfigForScript.template || "minimal";
    const baseTemplate = BANNER_TEMPLATES[templateKey] || BANNER_TEMPLATES.minimal;
    const styleOverrides = {
      backgroundColor: effectiveConfig.backgroundColor,
      textColor: effectiveConfig.textColor,
      buttonColor: effectiveConfig.buttonColor,
      buttonTextColor: effectiveConfig.buttonTextColor,
      borderRadius: effectiveConfig.borderRadius,
      fontSize: effectiveConfig.fontSize,
      padding: effectiveConfig.padding,
      border: effectiveConfig.border,
      boxShadow: effectiveConfig.boxShadow,
    };
    const bannerTemplate = {
      ...baseTemplate,
      style: Object.fromEntries(
        Object.entries({ ...baseTemplate.style, ...styleOverrides }).filter(([, value]) => value !== undefined && value !== null && value !== "")
      ),
    };

    // Common tracker domains and patterns to block (ONLY for scripts, NOT meta tags)
    const trackerDomains = [
      "google-analytics.com",
      "www.google-analytics.com",
      "googletagmanager.com",
      "www.googletagmanager.com",
      "google-analytics",
      "gtag.js",
      "gtag",
      "ga.js",
      "analytics.js",
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

    // Get base URL for verification callback and tracking
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.get("origin") || `http://${req.headers.get("host")}`);
    const verifyCallbackUrl = `${baseUrl}/api/sites/${finalSiteId}/verify-callback`;
    const trackUrl = `${baseUrl}/api/sites/${finalSiteId}/track`;

    // Generate a simple, reliable script
    // CRITICAL: Blocking must happen IMMEDIATELY, before any other code runs
    const script = `(function(){
console.log('[Consent SDK] Script loading...', 'Preview mode: ${isPreview}');
// CRITICAL: In preview mode, clear consent FIRST before any checks
var isPreviewMode=${isPreview ? "true" : "false"};
var SITE_ID="${finalSiteId.replace(/"/g, '\\"')}";
var CONSENT_KEY='cookie_consent_'+SITE_ID;
if(isPreviewMode){
console.log('[Consent SDK] Preview mode - clearing consent immediately');
localStorage.removeItem(CONSENT_KEY);
localStorage.removeItem(CONSENT_KEY+'_prefs');
// Also remove any existing banner to force refresh
if(document.getElementById('cookie-banner')){
document.getElementById('cookie-banner').remove();
}
}
// IMMEDIATE blocking - this runs FIRST, before any trackers can load
(function immediateBlock(){
var stored=localStorage.getItem(CONSENT_KEY);
var hasConsent=stored==='accepted';
var prefs=null;
if(hasConsent){
var prefsStr=localStorage.getItem(CONSENT_KEY+'_prefs');
if(prefsStr){
try{prefs=JSON.parse(prefsStr);}catch(e){}
}
if(!prefs)prefs={analytics:true,marketing:true};
}

// IMMEDIATELY block all tracker scripts BEFORE they can execute
var TRACKER_PATTERNS=['google-analytics','googletagmanager','gtag','ga.js','analytics.js','facebook.net','fbevents','fbq','doubleclick','googleadservices','googlesyndication'];
var scripts=document.querySelectorAll('script[src]');
scripts.forEach(function(s){
var src=(s.src||s.getAttribute('src')||'').toLowerCase();
var isTracker=TRACKER_PATTERNS.some(function(p){return src.indexOf(p)>-1;});
if(isTracker&&!hasConsent){
s.type='javascript/blocked';
s.removeAttribute('src');
s.setAttribute('data-blocked-src',s.src||s.getAttribute('src'));
console.log('[Consent SDK] IMMEDIATELY blocked:',src);
}else if(isTracker&&hasConsent){
var urlStr=src;
var isAnalytics=(urlStr.indexOf('google-analytics')>-1||urlStr.indexOf('googletagmanager')>-1||urlStr.indexOf('gtag')>-1||urlStr.indexOf('analytics')>-1);
var isMarketing=(urlStr.indexOf('facebook')>-1||urlStr.indexOf('fbevents')>-1||urlStr.indexOf('fbq')>-1||urlStr.indexOf('doubleclick')>-1);
if((isAnalytics&&!prefs.analytics)||(isMarketing&&!prefs.marketing)){
s.type='javascript/blocked';
s.removeAttribute('src');
s.setAttribute('data-blocked-src',s.src||s.getAttribute('src'));
console.log('[Consent SDK] IMMEDIATELY blocked based on preferences:',src);
}
}
});
})();

console.log('[Consent SDK] Loading...', window.location.href);
var DOMAIN="${domain.replace(/"/g, '\\"')}";
var ALLOWED_DOMAIN="${isPreview ? "*" : (allowedDomain ? allowedDomain.replace(/"/g, '\\"') : "*")}";
var IS_VERIFIED=${isPreview ? "true" : (siteVerified ? "true" : "false")};
var TRACKERS=${JSON.stringify(trackerDomains)};
// SITE_ID and CONSENT_KEY already defined above
var consent=localStorage.getItem(CONSENT_KEY)==='accepted';

// CRITICAL: Set up blocking IMMEDIATELY before anything else
function getConsentStatus(){
var stored=localStorage.getItem(CONSENT_KEY);
if(stored==='accepted'){
var prefs=localStorage.getItem(CONSENT_KEY+'_prefs');
if(prefs){
try{
return JSON.parse(prefs);
}catch(e){}
}
return {analytics:true,marketing:true}; // Default: all enabled if accepted
}
return null; // Not accepted
}

function isTracker(url){
if(!url)return false;
var urlStr=String(url).toLowerCase();
// More aggressive and specific matching for trackers
// Google Analytics patterns
if(urlStr.indexOf('google-analytics.com')>-1||urlStr.indexOf('www.google-analytics.com')>-1)return true;
if(urlStr.indexOf('analytics.js')>-1||urlStr.indexOf('ga.js')>-1)return true;
// Google Tag Manager patterns
if(urlStr.indexOf('googletagmanager.com')>-1||urlStr.indexOf('www.googletagmanager.com')>-1)return true;
if(urlStr.indexOf('gtag.js')>-1||urlStr.indexOf('/gtag')>-1)return true;
// Facebook Pixel patterns
if(urlStr.indexOf('facebook.net')>-1||urlStr.indexOf('connect.facebook.net')>-1)return true;
if(urlStr.indexOf('fbevents.js')>-1)return true;
if(urlStr.indexOf('facebook.com/tr')>-1)return true;
// Other tracker patterns
for(var i=0;i<TRACKERS.length;i++){
var pattern=TRACKERS[i].toLowerCase();
if(urlStr.indexOf(pattern)>-1)return true;
}
return false;
}

function isAnalyticsTracker(url){
if(!url)return false;
var urlStr=String(url).toLowerCase();
// More specific patterns for Google Analytics
var analyticsPatterns=[
'google-analytics.com',
'www.google-analytics.com',
'googletagmanager.com',
'www.googletagmanager.com',
'analytics.js',
'ga.js',
'gtag.js',
'/gtag',
'google-analytics',
'googletagmanager'
];
for(var i=0;i<analyticsPatterns.length;i++){
if(urlStr.indexOf(analyticsPatterns[i])>-1)return true;
}
return false;
}

function isMarketingTracker(url){
if(!url)return false;
var urlStr=String(url).toLowerCase();
// More specific patterns for Marketing trackers
var marketingPatterns=[
'facebook.net',
'connect.facebook.net',
'www.facebook.com/tr',
'facebook.com/tr',
'fbevents.js',
'fbq',
'doubleclick.net',
'googleadservices.com',
'googlesyndication.com',
'advertising'
];
for(var i=0;i<marketingPatterns.length;i++){
if(urlStr.indexOf(marketingPatterns[i])>-1)return true;
}
return false;
}

function shouldBlockTracker(url){
var consentStatus=getConsentStatus();
if(!consentStatus)return true; // Block if not accepted
if(consentStatus.analytics&&consentStatus.marketing)return false; // Allow all if both selected
if(isAnalyticsTracker(url)&&!consentStatus.analytics)return true; // Block analytics if not selected
if(isMarketingTracker(url)&&!consentStatus.marketing)return true; // Block marketing if not selected
if(isAnalyticsTracker(url)&&consentStatus.analytics)return false; // Allow analytics if selected
if(isMarketingTracker(url)&&consentStatus.marketing)return false; // Allow marketing if selected
return true; // Default: block unknown trackers
}

function blockScript(s){
if(s&&s.type!=='javascript/blocked'){
s.setAttribute('data-original-type',s.type||'text/javascript');
s.type='javascript/blocked';
// Also remove src to prevent loading
var originalSrc=s.src||s.getAttribute('src');
if(originalSrc){
s.setAttribute('data-blocked-src',originalSrc);
s.removeAttribute('src');
if(s.src)s.src=''; // Clear src property
}
console.log('[Consent SDK] Blocked script:',originalSrc);
}
}

// Block existing scripts IMMEDIATELY - check consent status
// IMPORTANT: Only block SCRIPT tags, NOT meta tags or other elements
// This runs IMMEDIATELY when script loads, before any trackers can execute
var consentStatus=getConsentStatus();
if(!consentStatus){
console.log('[Consent SDK] Blocking ALL trackers - consent not granted');
// Block all external scripts with tracker URLs - MORE AGGRESSIVE
var existingScripts=document.querySelectorAll('script[src]');
existingScripts.forEach(function(s){
var scriptSrc=s.src||s.getAttribute('src')||'';
if(scriptSrc&&isTracker(scriptSrc)){
blockScript(s);
// Also prevent execution by removing from DOM and re-adding as blocked
try{
var parent=s.parentNode;
if(parent){
var blockedScript=document.createElement('script');
blockedScript.type='javascript/blocked';
blockedScript.setAttribute('data-blocked-src',scriptSrc);
blockedScript.setAttribute('data-original-type',s.type||'text/javascript');
parent.replaceChild(blockedScript,s);
console.log('[Consent SDK] ✓ Blocked and replaced existing script:',scriptSrc);
}
}catch(e){
console.warn('[Consent SDK] Error blocking script:',e);
}
}
});
// Also check inline scripts - MORE AGGRESSIVE
var inlineScripts=document.querySelectorAll('script:not([src])');
inlineScripts.forEach(function(s){
var scriptContent=s.textContent||s.innerHTML||'';
if(scriptContent){
var lowerContent=scriptContent.toLowerCase();
// Check for any tracker patterns
var hasTracker=lowerContent.indexOf('gtag')>-1||
lowerContent.indexOf('ga(')>-1||
lowerContent.indexOf('fbq')>-1||
lowerContent.indexOf('dataLayer')>-1||
lowerContent.indexOf('googletagmanager')>-1||
lowerContent.indexOf('google-analytics')>-1||
lowerContent.indexOf('facebook.net')>-1||
lowerContent.indexOf('analytics')>-1&&lowerContent.indexOf('google')>-1;
if(hasTracker){
s.textContent='// Blocked by consent manager';
s.innerHTML='// Blocked by consent manager';
console.log('[Consent SDK] ✓ Blocked inline tracker script');
}
}
}
});
}else{
console.log('[Consent SDK] Consent granted, checking preferences:',consentStatus);
// Even if accepted, block based on preferences
var existingScripts=document.querySelectorAll('script[src]');
existingScripts.forEach(function(s){
var scriptSrc=s.src||s.getAttribute('src')||'';
if(scriptSrc&&isTracker(scriptSrc)&&shouldBlockTracker(scriptSrc)){
blockScript(s);
// Replace with blocked version
try{
var parent=s.parentNode;
if(parent){
var blockedScript=document.createElement('script');
blockedScript.type='javascript/blocked';
blockedScript.setAttribute('data-blocked-src',scriptSrc);
blockedScript.setAttribute('data-original-type',s.type||'text/javascript');
parent.replaceChild(blockedScript,s);
console.log('[Consent SDK] ✓ Blocked script based on preferences:',scriptSrc);
}
}catch(e){
console.warn('[Consent SDK] Error blocking script:',e);
}
}
});
// Check inline scripts based on preferences
var inlineScripts=document.querySelectorAll('script:not([src])');
inlineScripts.forEach(function(s){
var scriptContent=s.textContent||s.innerHTML||'';
if(scriptContent){
var lowerContent=scriptContent.toLowerCase();
var isAnalyticsInline=(lowerContent.indexOf('gtag')>-1||lowerContent.indexOf('ga(')>-1||lowerContent.indexOf('dataLayer')>-1||lowerContent.indexOf('googletagmanager')>-1||lowerContent.indexOf('analytics')>-1);
var isMarketingInline=(lowerContent.indexOf('fbq')>-1||lowerContent.indexOf('facebook')>-1||lowerContent.indexOf('tracking')>-1);
if(isAnalyticsInline&&!consentStatus.analytics){
s.textContent='// Blocked by consent manager (analytics disabled)';
s.innerHTML='// Blocked by consent manager (analytics disabled)';
console.log('[Consent SDK] ✓ Blocked inline analytics script');
}else if(isMarketingInline&&!consentStatus.marketing){
s.textContent='// Blocked by consent manager (marketing disabled)';
s.innerHTML='// Blocked by consent manager (marketing disabled)';
console.log('[Consent SDK] ✓ Blocked inline marketing script');
}
}
}
});
}

// Store original functions BEFORE intercepting
var origCreate=document.createElement;
var origFetch=window.fetch;
var origXHROpen=XMLHttpRequest.prototype.open;
var origXHRSend=XMLHttpRequest.prototype.send;

// Intercept createElement IMMEDIATELY - check consent dynamically
// IMPORTANT: Only intercept SCRIPT tags, NOT meta tags or other elements
document.createElement=function(tag){
var el=origCreate.call(document,tag);
var tagLower=tag.toLowerCase();
// Only block script tags, NOT meta, link, or other tags
if(tagLower==='script'){
var src='';
var innerHTML='';
Object.defineProperty(el,'src',{
get:function(){return src;},
set:function(v){
src=v;
if(v)el.setAttribute('src',v);
// Check consent and preferences dynamically
if(v&&isTracker(v)&&shouldBlockTracker(v)){
blockScript(el);
console.log('[Consent SDK] Blocked new script:',v);
}
}
});
// Block inline scripts with tracker code
Object.defineProperty(el,'innerHTML',{
get:function(){return innerHTML;},
set:function(v){
innerHTML=v;
if(v){
var lowerV=v.toLowerCase();
var isAnalyticsInline=(lowerV.indexOf('gtag')>-1||lowerV.indexOf('ga(')>-1||lowerV.indexOf('dataLayer')>-1||lowerV.indexOf('analytics')>-1);
var isMarketingInline=(lowerV.indexOf('fbq')>-1||lowerV.indexOf('facebook')>-1||lowerV.indexOf('tracking')>-1);
var consentStatus=getConsentStatus();
if(!consentStatus){
// Block all if not accepted
if(isAnalyticsInline||isMarketingInline){
el.textContent='// Blocked by consent manager';
console.log('[Consent SDK] Blocked inline tracker script');
return;
}
}else{
// Block based on preferences
if(isAnalyticsInline&&!consentStatus.analytics){
el.textContent='// Blocked by consent manager (analytics disabled)';
console.log('[Consent SDK] Blocked inline analytics script');
return;
}
if(isMarketingInline&&!consentStatus.marketing){
el.textContent='// Blocked by consent manager (marketing disabled)';
console.log('[Consent SDK] Blocked inline marketing script');
return;
}
}
}
el.innerHTML=v;
}
});
// Also check if src is set via setAttribute
var originalSetAttribute=el.setAttribute;
el.setAttribute=function(name,value){
originalSetAttribute.call(this,name,value);
if(name==='src'&&isTracker(value)&&shouldBlockTracker(value)){
blockScript(el);
console.log('[Consent SDK] Blocked script via setAttribute:',value);
}
};
}
return el;
};

// Intercept fetch IMMEDIATELY - handle both fetch(url) and fetch(url, options)
window.fetch=function(input,init){
var url=typeof input==='string'?input:(input&&input.url?input.url:'');
if(url&&isTracker(url)){
if(shouldBlockTracker(url)){
console.log('[Consent SDK] ✓ Blocked fetch:',url);
return Promise.reject(new Error('Blocked by consent manager'));
}else{
console.log('[Consent SDK] Allowing fetch based on preferences:',url);
}
}
return origFetch.apply(this,arguments);
};

// Intercept XHR open and send IMMEDIATELY - MORE AGGRESSIVE
XMLHttpRequest.prototype.open=function(method,url){
if(url&&isTracker(url)){
if(shouldBlockTracker(url)){
console.log('[Consent SDK] ✓ Blocked XHR open:',url);
this._blocked=true;
this._blockedUrl=url;
this.readyState=0; // Prevent further processing
return;
}else{
console.log('[Consent SDK] Allowing XHR based on preferences:',url);
}
}
this._blocked=false;
return origXHROpen.apply(this,arguments);
};

XMLHttpRequest.prototype.send=function(data){
if(this._blocked){
console.log('[Consent SDK] Blocked XHR send:',this._blockedUrl);
return;
}
return origXHRSend.apply(this,arguments);
};

// Block dataLayer (Google Tag Manager) - check consent and preferences dynamically
if(typeof window!=='undefined'){
var originalDataLayer=window.dataLayer;
Object.defineProperty(window,'dataLayer',{
get:function(){
var consentStatus=getConsentStatus();
if(!consentStatus||!consentStatus.analytics){
console.log('[Consent SDK] Blocked dataLayer access');
return [];
}
return originalDataLayer||[];
},
set:function(v){
var consentStatus=getConsentStatus();
if(!consentStatus||!consentStatus.analytics){
console.log('[Consent SDK] Blocked dataLayer assignment');
return;
}
originalDataLayer=v;
},
configurable:true
});
}

// Block gtag function - check preferences - MORE AGGRESSIVE
if(typeof window!=='undefined'){
// Store original if exists
var originalGtag=window.gtag;
window.gtag=function(){
var consentStatus=getConsentStatus();
if(!consentStatus||!consentStatus.analytics){
console.log('[Consent SDK] ✓ Blocked gtag call');
return;
}
// If consent granted, call original or allow
if(originalGtag&&typeof originalGtag==='function'){
return originalGtag.apply(this,arguments);
}
// Otherwise, allow the call (tracker will execute)
};
}

// Block fbq function (Facebook Pixel) - check preferences - MORE AGGRESSIVE
if(typeof window!=='undefined'){
// Store original if exists
var originalFbq=window.fbq;
window.fbq=function(){
var consentStatus=getConsentStatus();
if(!consentStatus||!consentStatus.marketing){
console.log('[Consent SDK] ✓ Blocked fbq call');
return;
}
// If consent granted, call original or allow
if(originalFbq&&typeof originalFbq==='function'){
return originalFbq.apply(this,arguments);
}
// Otherwise, allow the call (tracker will execute)
};
}

console.log('[Consent SDK] Tracker blocking initialized');

// Domain check - warn if mismatch but continue (banner should always show)
var currentHost=window.location.hostname.toLowerCase();
var allowedHost=ALLOWED_DOMAIN !== "*" ? ALLOWED_DOMAIN.toLowerCase().replace(/^www\\./,'') : null;
currentHost=currentHost.replace(/^www\\./,'');

var domainMatches=true;
if(allowedHost && currentHost !== allowedHost){
console.warn('[Consent SDK] Domain mismatch. Current:',currentHost,'Allowed:',allowedHost);
console.warn('[Consent SDK] Some features may not work on this domain.');
domainMatches=false;
// Don't return - banner should still show even if domain doesn't match
}else{
console.log('[Consent SDK] Domain matches:',currentHost);
}

// Auto-connect domain by calling verification callback (only if domain matches)
console.log('[Consent SDK] Attempting to connect domain...');
(function connectDomain(){
if(${isPreview ? "true" : "false"}){return;}
// Only connect if domain matches
if(!domainMatches){
console.log('[Consent SDK] Skipping domain connection - domain mismatch');
return;
}
try{
var currentDomain=window.location.hostname.toLowerCase().replace(/^www\\./,'');
var verifyUrl="${verifyCallbackUrl.replace(/"/g, '\\"')}?domain="+encodeURIComponent(currentDomain)+("${isPreview ? "&preview=1" : ""}");
console.log('[Consent SDK] Calling verification endpoint:',verifyUrl);
console.log('[Consent SDK] Current domain:',currentDomain);
console.log('[Consent SDK] Allowed domain:',allowedHost||'*');

var fetchOptions={
method:'GET',
mode:'cors',
credentials:'omit',
headers:{'Accept':'application/json'},
cache:'no-cache'
};

fetch(verifyUrl,fetchOptions).then(function(r){
console.log('[Consent SDK] Verification response status:',r.status);
console.log('[Consent SDK] Response headers:',r.headers);
if(!r.ok){
console.warn('[Consent SDK] Connection request failed:',r.status,r.statusText);
return r.text().then(function(text){
console.log('[Consent SDK] Error response body:',text);
try{
var parsed=JSON.parse(text);
console.error('[Consent SDK] Parsed error:',parsed);
return parsed;
}catch(e){
console.error('[Consent SDK] Could not parse error response:',e);
return {error:text};
}
});
}
return r.json();
}).then(function(data){
console.log('[Consent SDK] Verification response data:',JSON.stringify(data));
if(data&&data.connected){
console.log('[Consent SDK] ✓ Domain connected successfully!');
IS_VERIFIED=true;
// Try to notify user (optional)
if(typeof window!=='undefined'&&window.console&&window.console.info){
window.console.info('[Consent SDK] Domain connection successful!');
}
}else if(data){
console.warn('[Consent SDK] Connection failed:',data.error||'Unknown error',data);
if(data.requestDomain && data.storedDomain){
console.warn('[Consent SDK] Domain mismatch - Request:',data.requestDomain,'Stored:',data.storedDomain);
}
if(data.debug){
console.warn('[Consent SDK] Debug info:',data.debug);
}
}
}).catch(function(err){
console.error('[Consent SDK] Connection request error:',err);
console.error('[Consent SDK] Error details:',{
message:err.message,
stack:err.stack,
name:err.name
});
// Retry once after 2 seconds if it's a network error
if(err.message&&(err.message.includes('fetch')||err.message.includes('network')||err.message.includes('Failed to fetch'))){
console.log('[Consent SDK] Network error detected, will retry in 2 seconds...');
setTimeout(connectDomain,2000);
}
});
}catch(e){
console.error('[Consent SDK] Error in connectDomain function:',e);
}
})();

// Track page view (only if domain matches)
(function trackPageView(){
if(${isPreview ? "true" : "false"}){return;}
// Only track if domain matches
if(!domainMatches){
console.log('[Consent SDK] Skipping page view tracking - domain mismatch');
return;
}
try{
var trackData={
pagePath:window.location.pathname+window.location.search,
pageTitle:document.title||null,
userAgent:navigator.userAgent||null,
referer:document.referrer||null
};
fetch("${trackUrl.replace(/"/g, '\\"')}",{
method:'POST',
mode:'cors',
credentials:'omit',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(trackData),
cache:'no-cache'
}).then(function(r){
if(r.ok){
console.log('[Consent SDK] Page view tracked');
}else{
console.warn('[Consent SDK] Failed to track page view:',r.status);
}
}).catch(function(err){
console.warn('[Consent SDK] Page view tracking error:',err.message);
});
}catch(e){
console.warn('[Consent SDK] Error tracking page view:',e.message);
}
})();

console.log('[Consent SDK] Script loaded successfully');
console.log('[Consent SDK] Consent status:', consent, 'Key:', CONSENT_KEY);
console.log('[Consent SDK] Document ready state:', document.readyState);
console.log('[Consent SDK] Body exists:', !!document.body);

function showBanner(){
try{
var currentConsent=getConsentStatus();
var banner=document.getElementById('cookie-banner');
var bannerExists=!!banner;
console.log('[Consent SDK] showBanner called, preview mode:', isPreviewMode, 'consent status:', currentConsent, 'banner exists:', bannerExists);
// In preview mode, always show banner (remove existing to refresh). Otherwise, only show if no consent
if(!isPreviewMode && (currentConsent||bannerExists)){
console.log('[Consent SDK] Banner not needed - consent already granted or banner exists');
return;
}
// In preview mode, only remove existing banner if we need to refresh with new config
// But don't remove if banner is already visible and working
if(isPreviewMode && bannerExists){
// Check if banner is actually visible (not hidden)
var bannerStyle=window.getComputedStyle(banner);
var isVisible=bannerStyle.display!=='none' && bannerStyle.visibility!=='hidden' && banner.offsetHeight>0;
if(isVisible){
console.log('[Consent SDK] Banner already visible in preview mode, skipping recreation');
return; // Don't recreate if already visible
}
// Only remove if banner is hidden or broken
var existingBanner=document.getElementById('cookie-banner');
if(existingBanner){
existingBanner.remove();
console.log('[Consent SDK] Removed hidden/broken banner for preview refresh');
}
}
if(!document.body){
console.log('[Consent SDK] Body not ready, retrying in 100ms');
setTimeout(showBanner,100);
return;
}
console.log('[Consent SDK] Attempting to create banner...');
try{
var cfg=${JSON.stringify(JSON.stringify(bannerConfigForScript))};
var tmpl=${JSON.stringify(JSON.stringify(bannerTemplate))};
cfg=JSON.parse(cfg);
tmpl=JSON.parse(tmpl);
}catch(e){
console.error('[Consent SDK] Error parsing banner config:',e);
cfg={title:'🍪 We use cookies',message:'This site uses tracking cookies. Accept to enable analytics.',acceptButtonText:'Accept',rejectButtonText:'Reject',customizeButtonText:'Customize',position:'bottom',showRejectButton:true,showCustomizeButton:true};
tmpl={style:{backgroundColor:'#667eea',textColor:'#ffffff',buttonColor:'#ffffff',buttonTextColor:'#667eea',padding:'20px',fontSize:'14px',borderRadius:'8px'}};
}
if(!cfg||!tmpl){
console.error('[Consent SDK] Banner config or template missing, using defaults');
cfg=cfg||{title:'🍪 We use cookies',message:'This site uses tracking cookies. Accept to enable analytics.',acceptButtonText:'Accept',rejectButtonText:'Reject',customizeButtonText:'Customize',position:'bottom',showRejectButton:true,showCustomizeButton:true};
tmpl=tmpl||{style:{backgroundColor:'#667eea',textColor:'#ffffff',buttonColor:'#ffffff',buttonTextColor:'#667eea',padding:'20px',fontSize:'14px',borderRadius:'8px'}};
}
var pos='';
if(cfg.position==='top'){
pos='top:0;bottom:auto;';
}else if(cfg.position==='top-left'){
pos='top:20px;bottom:auto;';
}else if(cfg.position==='top-right'){
pos='top:20px;bottom:auto;';
}else if(cfg.position==='bottom-left'){
pos='bottom:20px;top:auto;';
}else if(cfg.position==='bottom-right'){
pos='bottom:20px;top:auto;';
}else{
pos='bottom:0;top:auto;';
}
var b=document.createElement('div');
b.id='cookie-banner';
var bgColor=tmpl.style.backgroundColor||'#667eea';
var textColor=tmpl.style.textColor||'#ffffff';
var btnColor=tmpl.style.buttonColor||'#ffffff';
var btnTextColor=tmpl.style.buttonTextColor||'#667eea';
var padding=tmpl.style.padding||'20px';
var fontSize=tmpl.style.fontSize||'14px';
var borderRadius=tmpl.style.borderRadius||'8px';
var border=tmpl.style.border||'';
var boxShadow=tmpl.style.boxShadow||'';
// Fix position styles for different positions
var leftRight='';
if(cfg.position==='bottom-left'||cfg.position==='top-left'){
leftRight='left:20px;right:auto;';
}else if(cfg.position==='bottom-right'||cfg.position==='top-right'){
leftRight='right:20px;left:auto;';
}else{
leftRight='left:0;right:0;';
}
b.style.cssText='position:fixed;'+pos+leftRight+'background:'+bgColor+';color:'+textColor+';padding:'+padding+';z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:'+fontSize+';border-radius:'+borderRadius+';'+(border?'border:'+border+';':'')+(boxShadow?'box-shadow:'+boxShadow+';':'');
var acceptBtn=cfg.acceptButtonText||'Accept';
var rejectBtn=cfg.rejectButtonText||'Reject';
var customizeBtn=cfg.customizeButtonText||'Customize';
var title=cfg.title||'🍪 We use cookies';
var message=cfg.message||'This site uses tracking cookies. Accept to enable analytics.';
var showReject=cfg.showRejectButton!==false;
var showCustomize=cfg.showCustomizeButton!==false;
var titleEscaped=title.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var messageEscaped=message.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var acceptBtnEscaped=acceptBtn.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var rejectBtnEscaped=rejectBtn.replace(/'/g,"\\'").replace(/"/g,'&quot;');
var customizeBtnEscaped=customizeBtn.replace(/'/g,"\\'").replace(/"/g,'&quot;');
// Use addEventListener instead of inline onmouseover/onmouseout to avoid escaping issues
var buttonsHtml='<button id="accept-btn" style="background:'+btnColor+';color:'+btnTextColor+';border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:'+fontSize+';transition:opacity 0.2s;">'+acceptBtnEscaped+'</button>';
if(showReject){
buttonsHtml+='<button id="reject-btn" style="background:transparent;color:'+textColor+';border:2px solid '+textColor+';padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:'+fontSize+';transition:opacity 0.2s;">'+rejectBtnEscaped+'</button>';
}
if(showCustomize){
buttonsHtml+='<button id="customize-btn" style="background:transparent;color:'+textColor+';border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:'+fontSize+';text-decoration:underline;transition:opacity 0.2s;">'+customizeBtnEscaped+'</button>';
}
b.innerHTML='<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;font-weight:600;">'+titleEscaped+'</h3><p style="margin:0;opacity:0.9;line-height:1.5;">'+messageEscaped+'</p></div><div style="display:flex;gap:10px;flex-wrap:wrap;">'+buttonsHtml+'</div>';
document.body.appendChild(b);
// Force banner to be visible - ensure it's not hidden
b.style.display='flex';
b.style.visibility='visible';
b.style.opacity='1';
console.log('[Consent SDK] Banner appended to body, checking if visible...', b.offsetHeight, b.offsetWidth);
// Verify banner is actually visible after a short delay
setTimeout(function(){
var checkBanner=document.getElementById('cookie-banner');
if(checkBanner){
var checkStyle=window.getComputedStyle(checkBanner);
console.log('[Consent SDK] Banner visibility check - display:',checkStyle.display,'visibility:',checkStyle.visibility,'height:',checkBanner.offsetHeight,'z-index:',checkStyle.zIndex);
if(checkStyle.display==='none'||checkStyle.visibility==='hidden'||checkBanner.offsetHeight===0){
console.warn('[Consent SDK] Banner is hidden! Forcing visibility...');
checkBanner.style.display='flex';
checkBanner.style.visibility='visible';
checkBanner.style.opacity='1';
checkBanner.style.zIndex='999999';
}
}
},100);
// Add hover effects using addEventListener to avoid escaping issues
var acceptBtnEl=document.getElementById('accept-btn');
if(acceptBtnEl){
acceptBtnEl.addEventListener('mouseover',function(){this.style.opacity='0.9';});
acceptBtnEl.addEventListener('mouseout',function(){this.style.opacity='1';});
acceptBtnEl.onclick=function(){
consent=true;
localStorage.setItem(CONSENT_KEY,'accepted');
localStorage.setItem(CONSENT_KEY+'_prefs',JSON.stringify({analytics:true,marketing:true}));
b.remove();
enableTrackers({analytics:true,marketing:true});
};
}
// In preview mode, prevent banner from being removed by other code
if(isPreviewMode){
console.log('[Consent SDK] Preview mode - protecting banner from removal');
// Store reference to prevent accidental removal
window._consentBannerPreview=b;
}
if(showReject){
var rejectBtnEl=document.getElementById('reject-btn');
if(rejectBtnEl){
rejectBtnEl.addEventListener('mouseover',function(){this.style.opacity='0.9';});
rejectBtnEl.addEventListener('mouseout',function(){this.style.opacity='1';});
rejectBtnEl.onclick=function(){
localStorage.setItem(CONSENT_KEY,'rejected');
b.remove();
// Keep blocking trackers - don't enable them
console.log('[Consent SDK] Consent rejected - trackers remain blocked');
};
}
}
if(showCustomize){
var customizeBtnEl=document.getElementById('customize-btn');
if(customizeBtnEl){
customizeBtnEl.addEventListener('mouseover',function(){this.style.opacity='0.9';});
customizeBtnEl.addEventListener('mouseout',function(){this.style.opacity='1';});
customizeBtnEl.onclick=function(){
// Show customization panel
showCustomizePanel(b);
};
}
}
console.log('[Consent SDK] Banner shown successfully');
var finalBanner=document.getElementById('cookie-banner');
console.log('[Consent SDK] Banner element:', finalBanner);
if(finalBanner){
console.log('[Consent SDK] Banner dimensions:', finalBanner.offsetWidth, 'x', finalBanner.offsetHeight);
console.log('[Consent SDK] Banner computed style display:', window.getComputedStyle(finalBanner).display);
console.log('[Consent SDK] Banner computed style visibility:', window.getComputedStyle(finalBanner).visibility);
console.log('[Consent SDK] Banner computed style z-index:', window.getComputedStyle(finalBanner).zIndex);
}
}catch(e){
console.error('[Consent SDK] Error showing banner:',e);
console.error('[Consent SDK] Error stack:', e.stack);
// Fallback banner - always show something even if there's an error
try{
var fallbackBanner=document.createElement('div');
fallbackBanner.id='cookie-banner';
fallbackBanner.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:sans-serif;';
fallbackBanner.innerHTML='<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;">This site uses tracking cookies. Accept to enable analytics.</p></div><div style="display:flex;gap:10px;"><button id="accept-btn-fallback" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button><button id="reject-btn-fallback" style="background:transparent;color:#fff;border:2px solid #fff;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Reject</button></div>';
if(document.body){
document.body.appendChild(fallbackBanner);
document.getElementById('accept-btn-fallback').onclick=function(){
localStorage.setItem(CONSENT_KEY,'accepted');
localStorage.setItem(CONSENT_KEY+'_prefs',JSON.stringify({analytics:true,marketing:true}));
fallbackBanner.remove();
enableTrackers({analytics:true,marketing:true});
};
document.getElementById('reject-btn-fallback').onclick=function(){
localStorage.setItem(CONSENT_KEY,'rejected');
fallbackBanner.remove();
};
console.log('[Consent SDK] Fallback banner shown');
}
}catch(fallbackError){
console.error('[Consent SDK] Even fallback banner failed:',fallbackError);
}
}
// Fallback to simple banner
var fallback=document.createElement('div');
fallback.id='cookie-banner';
fallback.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:sans-serif;';
var fallbackButtons='<button id="accept-btn-fallback" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button><button id="reject-btn-fallback" style="background:transparent;color:#fff;border:2px solid #fff;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Reject</button>';
if(showCustomize){
fallbackButtons+='<button id="customize-btn-fallback" style="background:transparent;color:#fff;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;text-decoration:underline;">Customize</button>';
}
fallback.innerHTML='<div style="flex:1;"><h3 style="margin:0 0 8px 0;font-size:18px;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;">This site uses tracking cookies. Accept to enable analytics.</p></div><div style="display:flex;gap:10px;">'+fallbackButtons+'</div>';
document.body.appendChild(fallback);
document.getElementById('accept-btn-fallback').onclick=function(){
consent=true;
localStorage.setItem(CONSENT_KEY,'accepted');
localStorage.setItem(CONSENT_KEY+'_prefs',JSON.stringify({analytics:true,marketing:true}));
fallback.remove();
enableTrackers({analytics:true,marketing:true});
};
document.getElementById('reject-btn-fallback').onclick=function(){
localStorage.setItem(CONSENT_KEY,'rejected');
fallback.remove();
console.log('[Consent SDK] Consent rejected - trackers remain blocked');
};
if(showCustomize){
var customizeBtnFallback=document.getElementById('customize-btn-fallback');
if(customizeBtnFallback){
customizeBtnFallback.onclick=function(){
showCustomizePanel(fallback);
};
}
}
}
}

function showCustomizePanel(banner){
var panel=document.getElementById('cookie-customize-panel');
if(panel){
panel.remove();
return;
}
panel=document.createElement('div');
panel.id='cookie-customize-panel';
panel.style.cssText='position:fixed;bottom:80px;left:20px;right:20px;max-width:500px;margin:0 auto;background:white;border:2px solid #e5e7eb;border-radius:12px;padding:20px;z-index:1000000;box-shadow:0 10px 25px rgba(0,0,0,0.2);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
panel.innerHTML='<div style="margin-bottom:15px;"><h4 style="margin:0 0 10px 0;font-size:16px;font-weight:600;color:#111827;">Cookie Preferences</h4><p style="margin:0;font-size:14px;color:#6b7280;">Choose which cookies you want to accept:</p></div>'+
'<div style="margin-bottom:15px;"><label id="customize-analytics-label" style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;border-radius:6px;transition:background 0.2s;"><input type="checkbox" id="customize-analytics" checked style="width:18px;height:18px;cursor:pointer;"><span style="flex:1;font-size:14px;color:#111827;"><strong>Analytics Cookies</strong><br><span style="font-size:12px;color:#6b7280;">Help us understand how visitors interact with our website</span></span></label></div>'+
'<div style="margin-bottom:15px;"><label id="customize-marketing-label" style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px;border-radius:6px;transition:background 0.2s;"><input type="checkbox" id="customize-marketing" checked style="width:18px;height:18px;cursor:pointer;"><span style="flex:1;font-size:14px;color:#111827;"><strong>Marketing Cookies</strong><br><span style="font-size:12px;color:#6b7280;">Used to track visitors across websites for advertising</span></span></label></div>'+
'<div style="display:flex;gap:10px;margin-top:20px;"><button id="customize-save" style="flex:1;background:#4f46e5;color:white;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;transition:opacity 0.2s;">Save Preferences</button><button id="customize-accept-all" style="flex:1;background:#10b981;color:white;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;transition:opacity 0.2s;">Accept All</button></div>';
// Add hover effects using addEventListener
var analyticsLabel=document.getElementById('customize-analytics-label');
if(analyticsLabel){
analyticsLabel.addEventListener('mouseover',function(){this.style.background='#f3f4f6';});
analyticsLabel.addEventListener('mouseout',function(){this.style.background='transparent';});
}
var marketingLabel=document.getElementById('customize-marketing-label');
if(marketingLabel){
marketingLabel.addEventListener('mouseover',function(){this.style.background='#f3f4f6';});
marketingLabel.addEventListener('mouseout',function(){this.style.background='transparent';});
}
var saveBtn=document.getElementById('customize-save');
if(saveBtn){
saveBtn.addEventListener('mouseover',function(){this.style.opacity='0.9';});
saveBtn.addEventListener('mouseout',function(){this.style.opacity='1';});
}
var acceptAllBtn=document.getElementById('customize-accept-all');
if(acceptAllBtn){
acceptAllBtn.addEventListener('mouseover',function(){this.style.opacity='0.9';});
acceptAllBtn.addEventListener('mouseout',function(){this.style.opacity='1';});
}
document.body.appendChild(panel);
document.getElementById('customize-save').onclick=function(){
var analytics=document.getElementById('customize-analytics').checked;
var marketing=document.getElementById('customize-marketing').checked;
if(analytics||marketing){
localStorage.setItem(CONSENT_KEY,'accepted');
localStorage.setItem(CONSENT_KEY+'_prefs',JSON.stringify({analytics:analytics,marketing:marketing}));
banner.remove();
panel.remove();
enableTrackers({analytics:analytics,marketing:marketing});
console.log('[Consent SDK] Custom preferences saved:',{analytics:analytics,marketing:marketing});
}else{
localStorage.setItem(CONSENT_KEY,'rejected');
localStorage.removeItem(CONSENT_KEY+'_prefs');
banner.remove();
panel.remove();
console.log('[Consent SDK] All cookies rejected - trackers remain blocked');
}
};
document.getElementById('customize-accept-all').onclick=function(){
localStorage.setItem(CONSENT_KEY,'accepted');
localStorage.setItem(CONSENT_KEY+'_prefs',JSON.stringify({analytics:true,marketing:true}));
banner.remove();
panel.remove();
enableTrackers({analytics:true,marketing:true});
};
}
function enableTrackers(prefs){
console.log('[Consent SDK] Enabling trackers...',prefs);
consent=true;
if(!prefs){
prefs={analytics:true,marketing:true};
}
// Save preferences first
localStorage.setItem(CONSENT_KEY,'accepted');
localStorage.setItem(CONSENT_KEY+'_prefs',JSON.stringify(prefs));

// Restore blocked scripts based on preferences
document.querySelectorAll('script[type="javascript/blocked"]').forEach(function(s){
// Get script source from data-blocked-src attribute (where we stored it)
var scriptSrc=s.getAttribute('data-blocked-src')||s.src||s.getAttribute('src')||'';
if(!scriptSrc)return;
// Check if should still be blocked based on preferences
if(shouldBlockTracker(scriptSrc)){
console.log('[Consent SDK] Keeping script blocked based on preferences:',scriptSrc);
return; // Don't restore if should be blocked
}
// Restore the script - use original createElement to avoid interceptor
var n=origCreate.call(document,'script');
n.src=scriptSrc;
if(s.hasAttribute('async'))n.async=true;
if(s.hasAttribute('defer'))n.defer=true;
if(s.id)n.id=s.id;
if(s.className)n.className=s.className;
// Copy all data attributes (except data-blocked-src and data-original-type)
for(var i=0;i<s.attributes.length;i++){
var attr=s.attributes[i];
if(attr.name.startsWith('data-')&&attr.name!=='data-blocked-src'&&attr.name!=='data-original-type'){
n.setAttribute(attr.name,attr.value);
}
}
// Restore original type if stored
var originalType=s.getAttribute('data-original-type');
if(originalType)n.type=originalType;
s.parentNode.replaceChild(n,s);
console.log('[Consent SDK] ✓ Restored script:',n.src);
});

// DON'T restore original functions - keep intercepting but allow based on preferences
// The interceptors already check shouldBlockTracker() which uses preferences
// This way, new scripts loaded after consent will also respect preferences

// Restore dataLayer, gtag, fbq based on preferences
if(typeof window!=='undefined'){
// Remove the blocking property descriptors to allow normal operation
// But they will still be checked by shouldBlockTracker in interceptors
try{
delete window.dataLayer;
}catch(e){}
try{
delete window.gtag;
}catch(e){}
try{
delete window.fbq;
}catch(e){}
}

console.log('[Consent SDK] Trackers enabled based on preferences:',prefs);
}

// Show banner logic - ALWAYS show in preview mode, otherwise only if consent not granted
// Note: Consent already cleared in preview mode at the top of the script
var currentConsentStatus=getConsentStatus();
var shouldShowBanner=isPreviewMode || !currentConsentStatus;

if(shouldShowBanner){
console.log('[Consent SDK] Should show banner - preview mode:', isPreviewMode, 'has consent:', !!currentConsentStatus);
// Try to show banner immediately
showBanner();
// Also set up multiple fallbacks to ensure banner shows
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',function(){
setTimeout(showBanner,100);
});
}
// Multiple timeouts to ensure banner shows even if page loads slowly
setTimeout(showBanner,100);
setTimeout(showBanner,500);
setTimeout(showBanner,1000);
setTimeout(showBanner,2000);
setTimeout(showBanner,3000);
// Also try when window loads - but check if banner is already visible first
window.addEventListener('load',function(){
setTimeout(function(){
var existingBanner=document.getElementById('cookie-banner');
if(existingBanner){
// Banner exists, check if it's visible
var bannerStyle=window.getComputedStyle(existingBanner);
var isVisible=bannerStyle.display!=='none' && bannerStyle.visibility!=='hidden' && existingBanner.offsetHeight>0;
if(isVisible){
console.log('[Consent SDK] Banner already visible on load, skipping re-show');
return;
}
console.log('[Consent SDK] Banner exists but not visible, re-showing...');
}
showBanner();
},100);
});
// In preview mode, continuously check and re-show banner if it disappears
if(isPreviewMode){
console.log('[Consent SDK] Preview mode - setting up banner watchdog');
var bannerWatchdog=setInterval(function(){
var banner=document.getElementById('cookie-banner');
if(!banner && document.body){
console.log('[Consent SDK] Banner disappeared in preview mode, re-showing...');
showBanner();
}else if(banner){
// Banner exists, check if it's actually visible
var bannerStyle=window.getComputedStyle(banner);
var isVisible=bannerStyle.display!=='none' && bannerStyle.visibility!=='hidden' && banner.offsetHeight>0;
if(!isVisible){
console.log('[Consent SDK] Banner exists but hidden in preview mode, forcing visibility...');
banner.style.display='flex';
banner.style.visibility='visible';
banner.style.opacity='1';
banner.style.zIndex='999999';
}
}
},500);
// Stop watchdog after 30 seconds to avoid infinite loop
setTimeout(function(){
clearInterval(bannerWatchdog);
console.log('[Consent SDK] Banner watchdog stopped');
},30000);
}
}else{
if(currentConsentStatus.analytics&&currentConsentStatus.marketing){
console.log('[Consent SDK] Consent already granted - all trackers enabled');
}else{
console.log('[Consent SDK] Consent granted with preferences:',currentConsentStatus);
}
}

var finalConsentStatus=getConsentStatus();
console.log('[Consent SDK] Initialized - Consent:',finalConsentStatus?JSON.stringify(finalConsentStatus):'not granted');
})();`;

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=60, must-revalidate", // Reduced to 60 seconds to allow banner updates to show quickly
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("Script generation error:", error);
    // Even on error, return a working script with default values
    const fallbackScript = `(function(){
console.log('[Consent SDK] Error occurred, using fallback');
var TRACKERS=["google-analytics.com","googletagmanager.com","facebook.net","connect.facebook.net"];
var CONSENT_KEY='cookie_consent_fallback';
var consent=localStorage.getItem(CONSENT_KEY)==='accepted';
function isTracker(url){if(!url)return false;for(var i=0;i<TRACKERS.length;i++){if(url.indexOf(TRACKERS[i])>-1)return true;}return false;}
function blockScript(s){if(s.type!=='javascript/blocked'){s.setAttribute('data-original-type',s.type||'text/javascript');s.type='javascript/blocked';}}
function showBanner(){if(consent||document.getElementById('cookie-banner'))return;if(!document.body){setTimeout(showBanner,100);return;}
var b=document.createElement('div');b.id='cookie-banner';b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:sans-serif;';
b.innerHTML='<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;">This site uses tracking cookies. Accept to enable analytics.</p></div><div style="display:flex;gap:10px;"><button id="accept-btn" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button><button id="reject-btn" style="background:transparent;color:#fff;border:2px solid #fff;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Reject</button></div>';
document.body.appendChild(b);
document.getElementById('accept-btn').onclick=function(){consent=true;localStorage.setItem(CONSENT_KEY,'accepted');b.remove();};
document.getElementById('reject-btn').onclick=function(){localStorage.setItem(CONSENT_KEY,'rejected');b.remove();};}
if(!consent){document.querySelectorAll('script[src]').forEach(function(s){if(isTracker(s.src))blockScript(s);});}
showBanner();setTimeout(showBanner,500);setTimeout(showBanner,2000);
})();`;
    return new Response(fallbackScript, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=60, must-revalidate", // Reduced to 60 seconds to allow banner updates to show quickly
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  }
}
