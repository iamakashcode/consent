/**
 * Detects tracking codes in HTML content
 */

export function detectTrackers(html, domain) {
  const trackers = [];

  // Google Analytics (gtag.js, analytics.js, ga.js)
  const gaPatterns = [
    /googletagmanager\.com\/gtag\/js[^"']*id=([^"'\s&]+)/gi,
    /google-analytics\.com\/analytics\.js/gi,
    /google-analytics\.com\/ga\.js/gi,
    /gtag\(['"]config['"],\s*['"]([^'"]+)['"]/gi,
    /ga\(['"]create['"],\s*['"]([^'"]+)['"]/gi,
    /_gaq\.push\(['"]_setAccount['"],\s*['"]([^'"]+)['"]/gi,
  ];

  gaPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || "detected";
      if (!trackers.some((t) => t.id === id && t.type === "Google Analytics")) {
        trackers.push({
          name: "Google Analytics",
          type: "Google Analytics",
          id: id,
          details: `Tracking ID: ${id}`,
          domain: "google-analytics.com",
        });
      }
    }
  });

  // Google Tag Manager
  const gtmPatterns = [
    /googletagmanager\.com\/gtm\.js[^"']*id=([^"'\s&]+)/gi,
    /GTM-[A-Z0-9]+/gi,
  ];

  gtmPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || match[0];
      if (!trackers.some((t) => t.id === id && t.type === "Google Tag Manager")) {
        trackers.push({
          name: "Google Tag Manager",
          type: "Google Tag Manager",
          id: id,
          details: `Container ID: ${id}`,
          domain: "googletagmanager.com",
        });
      }
    }
  });

  // Facebook Pixel / Meta Pixel
  const fbPatterns = [
    /connect\.facebook\.net\/en_US\/fbevents\.js/gi,
    /fbq\(['"]init['"],\s*['"]?(\d+)['"]?/gi,
    /facebook\.com\/tr[^"']*id=(\d+)/gi,
  ];

  fbPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || "detected";
      if (!trackers.some((t) => t.id === id && t.type === "Meta Pixel")) {
        trackers.push({
          name: "Meta Pixel (Facebook)",
          type: "Meta Pixel",
          id: id,
          details: `Pixel ID: ${id}`,
          domain: "facebook.net",
        });
      }
    }
  });

  // LinkedIn Insight Tag
  const linkedinPatterns = [
    /snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js/gi,
    /_linkedin_partner_id\s*=\s*["']?(\d+)["']?/gi,
  ];

  linkedinPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || "detected";
      if (!trackers.some((t) => t.id === id && t.type === "LinkedIn")) {
        trackers.push({
          name: "LinkedIn Insight Tag",
          type: "LinkedIn",
          id: id,
          details: `Partner ID: ${id}`,
          domain: "licdn.com",
        });
      }
    }
  });

  // Twitter/X Pixel
  const twitterPatterns = [
    /analytics\.twitter\.com\/i\/adsct/gi,
    /twq\(['"]init['"],\s*['"]?([^'"]+)['"]?/gi,
  ];

  twitterPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || "detected";
      if (!trackers.some((t) => t.id === id && t.type === "Twitter")) {
        trackers.push({
          name: "Twitter Pixel",
          type: "Twitter",
          id: id,
          details: `Event ID: ${id}`,
          domain: "twitter.com",
        });
      }
    }
  });

  // Hotjar
  const hotjarPatterns = [
    /hotjar\.com\/js\/hotjar-([^"'\s]+)\.js/gi,
    /hj\(['"]settings['"],\s*['"]?(\d+)['"]?/gi,
  ];

  hotjarPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || "detected";
      if (!trackers.some((t) => t.id === id && t.type === "Hotjar")) {
        trackers.push({
          name: "Hotjar",
          type: "Hotjar",
          id: id,
          details: `Site ID: ${id}`,
          domain: "hotjar.com",
        });
      }
    }
  });

  // Adobe Analytics
  const adobePatterns = [
    /omniture\.com|adobe\.com\/analytics/gi,
    /s\.code|AppMeasurement/gi,
  ];

  adobePatterns.forEach((pattern) => {
    if (pattern.test(html)) {
      if (!trackers.some((t) => t.type === "Adobe Analytics")) {
        trackers.push({
          name: "Adobe Analytics",
          type: "Adobe Analytics",
          id: "detected",
          details: "Adobe Analytics detected",
          domain: "adobe.com",
        });
      }
    }
  });

  // Microsoft Clarity
  const clarityPatterns = [
    /clarity\.ms\/clarity\.js[^"']*c=([^"'\s&]+)/gi,
    /clarity\(['"]set['"],\s*['"]projectId['"],\s*['"]([^'"]+)['"]/gi,
  ];

  clarityPatterns.forEach((pattern) => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1] || "detected";
      if (!trackers.some((t) => t.id === id && t.type === "Microsoft Clarity")) {
        trackers.push({
          name: "Microsoft Clarity",
          type: "Microsoft Clarity",
          id: id,
          details: `Project ID: ${id}`,
          domain: "clarity.ms",
        });
      }
    }
  });

  // Remove duplicates
  const uniqueTrackers = [];
  const seen = new Set();
  trackers.forEach((tracker) => {
    const key = `${tracker.type}-${tracker.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTrackers.push(tracker);
    }
  });

  return uniqueTrackers;
}

