(function () {
  const script = document.currentScript;
  const siteKey = script?.getAttribute("data-site-key");

  if (!siteKey) return;

  const domain = location.hostname;

  fetch(`/api/config?siteKey=${siteKey}&domain=${domain}`)
    .then((res) => res.json())
    .then((config) => {
      if (!config.valid) {
        console.warn("Consent SDK: invalid domain");
        return;
      }

      initConsent();
    });

  let consentGranted = false;

  function initConsent() {
    blockTracking();
    showBanner();
  }

  const TRACKERS = [
    "googletagmanager.com",
    "google-analytics.com",
    "facebook.net",
  ];

  function isTracking(src = "") {
    return TRACKERS.some((d) => src.includes(d));
  }

  const originalCreateElement = document.createElement;

  document.createElement = function (tag) {
    const el = originalCreateElement.call(document, tag);

    if (tag === "script") {
      Object.defineProperty(el, "src", {
        set(value) {
          if (isTracking(value) && !consentGranted) {
            el.type = "javascript/blocked";
          }
          el.setAttribute("src", value);
        },
      });
    }

    return el;
  };

  function showBanner() {
    const banner = document.createElement("div");
    banner.style.cssText =
      "position:fixed;bottom:0;left:0;right:0;background:#000;color:#fff;padding:10px;z-index:9999";

    banner.innerHTML = `
      <span>We use cookies</span>
      <button id="accept">Accept</button>
    `;

    document.body.appendChild(banner);

    document.getElementById("accept").onclick = () => {
      consentGranted = true;
      banner.remove();
      restoreScripts();
    };
  }

  function restoreScripts() {
    document
      .querySelectorAll('script[type="javascript/blocked"]')
      .forEach((s) => {
        const n = document.createElement("script");
        n.src = s.src;
        n.async = true;
        document.head.appendChild(n);
        s.remove();
      });
  }

  function blockTracking() {
    document.querySelectorAll("script[src]").forEach((s) => {
      if (isTracking(s.src) && !consentGranted) {
        s.type = "javascript/blocked";
      }
    });
  }
})();
