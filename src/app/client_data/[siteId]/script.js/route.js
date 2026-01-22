import { SITE_MAP } from "@/lib/site-map";

export async function GET(req, { params }) {
  const domain = SITE_MAP[params.siteId];

  if (!domain) {
    return new Response("// Invalid site", {
      headers: { "Content-Type": "application/javascript" }
    });
  }

  const js = `
(function () {
  const DOMAIN = "${domain}";
  const host = location.hostname.replace(/^www\\./, "");

  if (host !== DOMAIN) {
    console.warn("Consent script blocked: invalid domain");
    return;
  }

  const TRACKERS = [
    "googletagmanager.com",
    "google-analytics.com",
    "facebook.net"
  ];

  let consent = localStorage.getItem("analytics_consent");

  function isTracker(src = "") {
    return TRACKERS.some(d => src.includes(d));
  }

  function blockScript(script) {
    script.type = "javascript/blocked";
  }

  // Block existing scripts
  document.querySelectorAll("script[src]").forEach(s => {
    if (isTracker(s.src) && consent !== "yes") {
      blockScript(s);
    }
  });

  // Intercept future scripts
  const originalCreate = document.createElement;
  document.createElement = function(tag) {
    const el = originalCreate.call(document, tag);
    if (tag === "script") {
      Object.defineProperty(el, "src", {
        set(value) {
          if (isTracker(value) && consent !== "yes") {
            el.type = "javascript/blocked";
          }
          el.setAttribute("src", value);
        }
      });
    }
    return el;
  };

  if (!consent) showBanner();

  function showBanner() {
    const b = document.createElement("div");
    b.style = "position:fixed;bottom:0;left:0;right:0;background:#000;color:#fff;padding:12px;z-index:9999";

    b.innerHTML = \`
      This site uses cookies.
      <button id="accept">Accept</button>
      <button id="reject">Reject</button>
    \`;

    document.body.appendChild(b);

    document.getElementById("accept").onclick = () => {
      localStorage.setItem("analytics_consent", "yes");
      consent = "yes";
      restoreScripts();
      b.remove();
    };

    document.getElementById("reject").onclick = () => {
      localStorage.setItem("analytics_consent", "no");
      consent = "no";
      b.remove();
    };
  }

  function restoreScripts() {
    document.querySelectorAll('script[type="javascript/blocked"]').forEach(s => {
      const n = document.createElement("script");
      n.src = s.src;
      n.async = true;
      document.head.appendChild(n);
      s.remove();
    });
  }

  console.log("Consent SDK active for", DOMAIN);
})();
`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
