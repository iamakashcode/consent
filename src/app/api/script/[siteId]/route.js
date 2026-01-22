import { getSite } from "@/lib/store";

export async function GET(req, { params }) {
  try {
    const { siteId } = params;
    const { searchParams } = new URL(req.url);
    const domainParam = searchParams.get("domain");
    const trackersParam = searchParams.get("trackers");

    if (!siteId) {
      return new Response("// Invalid site ID", {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    let domain;
    const site = getSite(siteId);

    if (site) {
      // Site found in store
      domain = site.domain;
    } else if (domainParam) {
      // Use domain from query param
      domain = domainParam;
    } else {
      // Try to decode domain from siteId (fallback for old format)
      try {
        const decoded = Buffer.from(siteId, "base64").toString("utf-8");
        if (decoded && !decoded.includes("-")) {
          domain = decoded;
        } else {
          domain = "*"; // Allow any domain
        }
      } catch (e) {
        domain = "*"; // Allow any domain
      }
    }

    // Always use common tracker domains - simpler and more reliable
    // This blocks all major trackers regardless of detection
    const finalTrackerDomains = [
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

    // Generate the consent SDK script
    const script = `
(function() {
  'use strict';
  
  // Immediate execution test
  console.log("[Consent SDK] Script executing...");
  
  try {
  const DOMAIN = "${domain}";
  const TRACKER_DOMAINS = ${JSON.stringify(finalTrackerDomains)};
  const SITE_ID = "${siteId}";
  
  console.log("[Consent SDK] Initialized - Domain:", DOMAIN, "Trackers:", TRACKER_DOMAINS.length);
  
  // Verify domain (flexible - allow www and non-www, or allow all if DOMAIN is "*")
  if (DOMAIN !== "*") {
    const host = location.hostname.replace(/^www\\./, "").toLowerCase();
    const expectedDomain = DOMAIN.replace(/^www\\./, "").toLowerCase();
    if (host !== expectedDomain) {
      console.warn("[Consent SDK] Domain mismatch:", host, "!=", expectedDomain);
      console.warn("[Consent SDK] Script will still work but domain verification failed");
      // Don't return - allow script to run anyway
    }
  }
  
  // Check consent status (use site-specific key)
  const consentKey = "cookie_consent_" + SITE_ID;
  let consentGranted = localStorage.getItem(consentKey) === "accepted";
  
  // Check if tracker domain matches
  function isTrackerDomain(url) {
    if (!url) return false;
    try {
      const urlObj = new URL(url, location.origin);
      return TRACKER_DOMAINS.some(domain => 
        urlObj.hostname.includes(domain) || 
        url.includes(domain)
      );
    } catch {
      return TRACKER_DOMAINS.some(domain => url.includes(domain));
    }
  }
  
  // Block script by changing type
  function blockScript(script) {
    if (script.type !== "javascript/blocked") {
      script.setAttribute("data-original-type", script.type || "text/javascript");
      script.type = "javascript/blocked";
    }
  }
  
  // Restore script
  function restoreScript(script) {
    const originalType = script.getAttribute("data-original-type") || "text/javascript";
    script.type = originalType;
    script.removeAttribute("data-original-type");
  }
  
  // Block existing tracking scripts
  function blockExistingScripts() {
    document.querySelectorAll("script[src]").forEach(script => {
      if (isTrackerDomain(script.src) && !consentGranted) {
        blockScript(script);
      }
    });
  }
  
  // Intercept script creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(document, tagName, options);
    
    if (tagName.toLowerCase() === "script") {
      // Intercept src setter
      let scriptSrc = "";
      Object.defineProperty(element, "src", {
        get: function() {
          return scriptSrc;
        },
        set: function(value) {
          scriptSrc = value;
          if (isTrackerDomain(value) && !consentGranted) {
            blockScript(element);
          }
          element.setAttribute("src", value);
        }
      });
      
      // Intercept appendChild to check src after append
      const originalAppendChild = element.appendChild;
      element.appendChild = function(child) {
        const result = originalAppendChild.call(this, child);
        if (child.tagName === "SCRIPT" && child.src && isTrackerDomain(child.src) && !consentGranted) {
          blockScript(child);
        }
        return result;
      };
    }
    
    return element;
  };
  
  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === "string" && isTrackerDomain(url) && !consentGranted) {
      console.log("[Consent SDK] Blocked fetch to:", url);
      return Promise.reject(new Error("Consent not granted"));
    }
    return originalFetch.apply(this, arguments);
  };
  
  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (isTrackerDomain(url) && !consentGranted) {
      console.log("[Consent SDK] Blocked XHR to:", url);
      return;
    }
    return originalXHROpen.apply(this, arguments);
  };
  
  // Show consent banner
  function showConsentBanner() {
    if (document.getElementById("cookie-consent-banner")) {
      return; // Banner already exists
    }
    
    // Wait for body to exist
    function tryAppendBanner() {
      if (!document.body) {
        setTimeout(tryAppendBanner, 50);
        return;
      }
      
      const banner = document.createElement("div");
      banner.id = "cookie-consent-banner";
      banner.style.cssText = "position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.3); z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;";
      
      banner.innerHTML = '<div style="flex: 1; min-width: 250px;"><h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">🍪 We use cookies</h3><p style="margin: 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">This website uses tracking cookies to analyze site traffic and improve user experience. By accepting, you allow us to use analytics tools.</p></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><button id="cookie-consent-accept" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform=\\'scale(1.05)\\'" onmouseout="this.style.transform=\\'scale(1)\\'">Accept All</button><button id="cookie-consent-reject" style="background: transparent; color: white; border: 2px solid white; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform=\\'scale(1.05)\\'" onmouseout="this.style.transform=\\'scale(1)\\'">Reject</button></div>';
      
      document.body.appendChild(banner);
      
      // Accept button
      document.getElementById("cookie-consent-accept").addEventListener("click", function() {
        consentGranted = true;
        localStorage.setItem(consentKey, "accepted");
        banner.remove();
        enableTrackers();
      });
      
      // Reject button
      document.getElementById("cookie-consent-reject").addEventListener("click", function() {
        localStorage.setItem(consentKey, "rejected");
        banner.remove();
      });
      
      console.log("[Consent SDK] Banner displayed successfully");
      console.log("[Consent SDK] Banner element:", banner);
      console.log("[Consent SDK] Banner in DOM:", document.getElementById("cookie-consent-banner") !== null);
    }
    
    tryAppendBanner();
  }
  
  // Enable all trackers
  function enableTrackers() {
    // Restore blocked scripts
    document.querySelectorAll('script[type="javascript/blocked"]').forEach(script => {
      restoreScript(script);
      // Re-execute script
      const newScript = document.createElement("script");
      newScript.src = script.src;
      newScript.async = script.hasAttribute("async");
      newScript.defer = script.hasAttribute("defer");
      if (script.id) newScript.id = script.id;
      script.parentNode.replaceChild(newScript, script);
    });
    
    // Restore fetch and XHR
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    
    console.log("[Consent SDK] Trackers enabled");
  }
  
  // Simple, reliable banner display
  function displayBanner() {
    // Check if already shown or consent granted
    if (consentGranted || document.getElementById("cookie-consent-banner")) {
      return;
    }
    
    // Wait for body, then show
    function show() {
      if (!document.body) {
        setTimeout(show, 100);
        return;
      }
      
      try {
        const banner = document.createElement("div");
        banner.id = "cookie-consent-banner";
        banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;box-shadow:0 -4px 20px rgba(0,0,0,0.3);z-index:999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;";
        
        banner.innerHTML = '<div style="flex:1;min-width:250px;"><h3 style="margin:0 0 8px 0;font-size:18px;font-weight:600;">🍪 We use cookies</h3><p style="margin:0;font-size:14px;opacity:0.9;line-height:1.5;">This website uses tracking cookies. By accepting, you allow us to use analytics tools.</p></div><div style="display:flex;gap:10px;"><button id="cookie-consent-accept" style="background:white;color:#667eea;border:none;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">Accept</button><button id="cookie-consent-reject" style="background:transparent;color:white;border:2px solid white;padding:12px 24px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">Reject</button></div>';
        
        document.body.appendChild(banner);
        
        document.getElementById("cookie-consent-accept").onclick = function() {
          consentGranted = true;
          localStorage.setItem(consentKey, "accepted");
          banner.remove();
          enableTrackers();
        };
        
        document.getElementById("cookie-consent-reject").onclick = function() {
          localStorage.setItem(consentKey, "rejected");
          banner.remove();
        };
        
        console.log("[Consent SDK] Banner displayed");
      } catch (e) {
        console.error("[Consent SDK] Error showing banner:", e);
      }
    }
    
    show();
  }
  
  // Block scripts immediately
  if (!consentGranted) {
    blockExistingScripts();
  }
  
  // Show banner - try multiple times to ensure it shows
  console.log("[Consent SDK] Attempting to show banner...");
  displayBanner();
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      console.log("[Consent SDK] DOMContentLoaded - showing banner");
      displayBanner();
    });
  }
  
  setTimeout(function() {
    console.log("[Consent SDK] Timeout 1 - showing banner");
    displayBanner();
  }, 500);
  
  setTimeout(function() {
    console.log("[Consent SDK] Timeout 2 - showing banner");
    displayBanner();
  }, 2000);
  
  // Final fallback after 5 seconds
  setTimeout(function() {
    console.log("[Consent SDK] Final fallback - showing banner");
    displayBanner();
  }, 5000);
  
  } catch (error) {
    console.error("[Consent SDK] Error initializing:", error);
    // Try to show a simple banner even on error
    setTimeout(function() {
      if (document.body && !document.getElementById("cookie-consent-banner")) {
        const errorBanner = document.createElement("div");
        errorBanner.id = "cookie-consent-banner";
        errorBanner.style.cssText = "position: fixed; bottom: 0; left: 0; right: 0; background: #667eea; color: white; padding: 20px; z-index: 999999; text-align: center;";
        errorBanner.innerHTML = "<p>🍪 We use cookies. <button onclick='localStorage.setItem(\\\"cookie_consent_${siteId}\\\", \\\"accepted\\\"); this.parentElement.remove();'>Accept</button></p>";
        document.body.appendChild(errorBanner);
      }
    }, 1000);
  }
})();
`;

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Script generation error:", error);
    return new Response("// Error generating script", {
      headers: { "Content-Type": "application/javascript" },
      status: 500,
    });
  }
}

