import { getSite } from "@/lib/store";

export async function GET(req, { params }) {
  try {
    const { siteId } = params;
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");

    if (!siteId) {
      return new Response("// Invalid site ID", {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    let domain;
    const site = getSite(siteId);

    if (site) {
      domain = site.domain;
    } else if (domainParam) {
      domain = domainParam;
    } else {
      try {
        const decoded = Buffer.from(siteId, "base64").toString("utf-8");
        domain = decoded && !decoded.includes("-") ? decoded : "*";
      } catch (e) {
        domain = "*";
      }
    }

    // Common tracker domains to block
    const trackerDomains = [
      "google-analytics.com",
      "googletagmanager.com",
      "facebook.net",
      "connect.facebook.net",
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
      "adobe.com"
    ];

    // Generate a simple, reliable script
    const script = `(function(){
console.log('[Consent SDK] Loading...');
var DOMAIN="${domain}";
var TRACKERS=${JSON.stringify(trackerDomains)};
var SITE_ID="${siteId}";
var CONSENT_KEY='cookie_consent_'+SITE_ID;
var consent=localStorage.getItem(CONSENT_KEY)==='accepted';

function isTracker(url){
if(!url)return false;
for(var i=0;i<TRACKERS.length;i++){
if(url.indexOf(TRACKERS[i])>-1)return true;
}
return false;
}

function blockScript(s){
if(s.type!=='javascript/blocked'){
s.setAttribute('data-original-type',s.type||'text/javascript');
s.type='javascript/blocked';
console.log('[Consent SDK] Blocked:',s.src);
}
}

function showBanner(){
if(consent||document.getElementById('cookie-banner'))return;
if(!document.body){
setTimeout(showBanner,100);
return;
}
var b=document.createElement('div');
b.id='cookie-banner';
b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;padding:20px;z-index:999999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;font-family:sans-serif;';
b.innerHTML='<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;">This site uses tracking cookies. Accept to enable analytics.</p></div><div style="display:flex;gap:10px;"><button id="accept-btn" style="background:#fff;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Accept</button><button id="reject-btn" style="background:transparent;color:#fff;border:2px solid #fff;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;">Reject</button></div>';
document.body.appendChild(b);
document.getElementById('accept-btn').onclick=function(){
consent=true;
localStorage.setItem(CONSENT_KEY,'accepted');
b.remove();
enableTrackers();
};
document.getElementById('reject-btn').onclick=function(){
localStorage.setItem(CONSENT_KEY,'rejected');
b.remove();
};
console.log('[Consent SDK] Banner shown');
}

function enableTrackers(){
document.querySelectorAll('script[type="javascript/blocked"]').forEach(function(s){
var n=document.createElement('script');
n.src=s.src;
if(s.hasAttribute('async'))n.async=true;
if(s.hasAttribute('defer'))n.defer=true;
if(s.id)n.id=s.id;
s.parentNode.replaceChild(n,s);
});
console.log('[Consent SDK] Trackers enabled');
}

if(!consent){
document.querySelectorAll('script[src]').forEach(function(s){
if(isTracker(s.src))blockScript(s);
});

var origCreate=document.createElement;
document.createElement=function(tag){
var el=origCreate.call(document,tag);
if(tag.toLowerCase()==='script'){
var src='';
Object.defineProperty(el,'src',{
get:function(){return src;},
set:function(v){
src=v;
el.setAttribute('src',v);
if(isTracker(v)&&!consent)blockScript(el);
}
});
}
return el;
};

var origFetch=window.fetch;
window.fetch=function(url){
if(typeof url==='string'&&isTracker(url)&&!consent){
console.log('[Consent SDK] Blocked fetch:',url);
return Promise.reject(new Error('Blocked'));
}
return origFetch.apply(this,arguments);
};

var origXHR=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url){
if(isTracker(url)&&!consent){
console.log('[Consent SDK] Blocked XHR:',url);
return;
}
return origXHR.apply(this,arguments);
};
}

showBanner();
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',showBanner);
}
setTimeout(showBanner,500);
setTimeout(showBanner,2000);
console.log('[Consent SDK] Initialized');
})();`;

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Script generation error:", error);
    return new Response("// Error generating script: " + error.message, {
      headers: { "Content-Type": "application/javascript" },
      status: 500,
    });
  }
}
