import { getSite } from "@/lib/store";

export async function GET(req, { params }) {
  try {
    const { siteId } = params;

    if (!siteId) {
      return new Response("// Invalid site ID", {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    const site = getSite(siteId);

    if (!site) {
      return new Response("// Site not found", {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    const { domain, trackers } = site;

    // Build tracker domains list
    const trackerDomains = trackers.map((t) => t.domain).filter(Boolean);
    const uniqueDomains = [...new Set(trackerDomains)];

    // Generate the consent SDK script
    const script = `
(function() {
  'use strict';
  
  const DOMAIN = "${domain}";
  const TRACKER_DOMAINS = ${JSON.stringify(uniqueDomains)};
  const SITE_ID = "${siteId}";
  
  // Verify domain
  const host = location.hostname.replace(/^www\\./, "");
  if (host !== DOMAIN) {
    console.warn("[Consent SDK] Domain mismatch:", host, "!=", DOMAIN);
    return;
  }
  
  // Check consent status
  let consentGranted = localStorage.getItem("cookie_consent") === "accepted";
  
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
    
    const banner = document.createElement("div");
    banner.id = "cookie-consent-banner";
    banner.style.cssText = "position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.3); z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;";
    
    banner.innerHTML = '<div style="flex: 1; min-width: 250px;"><h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">🍪 We use cookies</h3><p style="margin: 0; font-size: 14px; opacity: 0.9; line-height: 1.5;">This website uses tracking cookies to analyze site traffic and improve user experience. By accepting, you allow us to use analytics tools.</p></div><div style="display: flex; gap: 10px; flex-wrap: wrap;"><button id="cookie-consent-accept" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform=\\'scale(1.05)\\'" onmouseout="this.style.transform=\\'scale(1)\\'">Accept All</button><button id="cookie-consent-reject" style="background: transparent; color: white; border: 2px solid white; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform=\\'scale(1.05)\\'" onmouseout="this.style.transform=\\'scale(1)\\'">Reject</button></div>';
    
    document.body.appendChild(banner);
    
    // Accept button
    document.getElementById("cookie-consent-accept").addEventListener("click", function() {
      consentGranted = true;
      localStorage.setItem("cookie_consent", "accepted");
      banner.remove();
      enableTrackers();
    });
    
    // Reject button
    document.getElementById("cookie-consent-reject").addEventListener("click", function() {
      localStorage.setItem("cookie_consent", "rejected");
      banner.remove();
    });
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
  
  // Initialize
  if (!consentGranted) {
    blockExistingScripts();
    // Show banner after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showConsentBanner);
    } else {
      showConsentBanner();
    }
  } else {
    console.log("[Consent SDK] Consent already granted");
  }
  
  console.log("[Consent SDK] Initialized for", DOMAIN);
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

