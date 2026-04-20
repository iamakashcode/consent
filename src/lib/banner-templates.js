// Banner design templates
export const BANNER_TEMPLATES = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple design",
    position: "bottom",
    style: {
      backgroundColor: "#1f2937",
      textColor: "#ffffff",
      buttonColor: "#3b82f6",
      buttonTextColor: "#ffffff",
      borderRadius: "8px",
      padding: "20px",
      fontSize: "14px",
    },
  },
  modern: {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with gradient",
    position: "bottom",
    style: {
      backgroundColor: "#667eea",
      textColor: "#ffffff",
      buttonColor: "#ffffff",
      buttonTextColor: "#667eea",
      borderRadius: "12px",
      padding: "24px",
      fontSize: "15px",
    },
  },
  elegant: {
    id: "elegant",
    name: "Elegant",
    description: "Sophisticated and professional",
    position: "bottom",
    style: {
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      buttonColor: "#1f2937",
      buttonTextColor: "#ffffff",
      borderRadius: "0px",
      padding: "20px",
      fontSize: "14px",
      border: "1px solid #e5e7eb",
    },
  },
  colorful: {
    id: "colorful",
    name: "Colorful",
    description: "Vibrant and eye-catching",
    position: "bottom",
    style: {
      backgroundColor: "#f59e0b",
      textColor: "#ffffff",
      buttonColor: "#ffffff",
      buttonTextColor: "#f59e0b",
      borderRadius: "16px",
      padding: "24px",
      fontSize: "16px",
    },
  },
  dark: {
    id: "dark",
    name: "Dark Mode",
    description: "Perfect for dark-themed websites",
    position: "bottom",
    style: {
      backgroundColor: "#000000",
      textColor: "#ffffff",
      buttonColor: "#ffffff",
      buttonTextColor: "#000000",
      borderRadius: "8px",
      padding: "20px",
      fontSize: "14px",
    },
  },
  light: {
    id: "light",
    name: "Light Mode",
    description: "Clean white design",
    position: "bottom",
    style: {
      backgroundColor: "#ffffff",
      textColor: "#374151",
      buttonColor: "#3b82f6",
      buttonTextColor: "#ffffff",
      borderRadius: "8px",
      padding: "20px",
      fontSize: "14px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
  },
};

// Alias so script can use BANNER_TEMPLATES.default
BANNER_TEMPLATES.default = BANNER_TEMPLATES.minimal;

// Default banner configuration – must match banner page defaults so first-time live script matches preview.
export const DEFAULT_BANNER_CONFIG = {
  template: "light",
  position: "bottom",
  title: "We value your privacy",
  message:
    "We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking 'Accept All', you consent to our use of cookies.",
  acceptText: "Accept All",
  rejectText: "Reject All",
  customizeText: "Customize Settings",
  // Keep legacy keys too, since older saved configs may still rely on these names.
  acceptButtonText: "Accept All",
  rejectButtonText: "Reject All",
  customizeButtonText: "Customize Settings",
  showRejectButton: true,
  showCustomizeButton: true,
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  buttonColor: "#0f172a",
  buttonTextColor: "#ffffff",
  customStyle: null,
};

/**
 * Fixed positioning for the consent banner (must match preview + live script).
 * Corner placements use a card width; full-width uses left/right stretch.
 */
export function bannerPlacementCss(position) {
  const p = position || "bottom";
  if (p === "top") return "top:0;bottom:auto;left:0;right:0;";
  if (p === "bottom-left") {
    return "bottom:24px;left:24px;right:auto;top:auto;width:auto;max-width:min(92vw,520px);";
  }
  if (p === "bottom-right") {
    return "bottom:24px;right:24px;left:auto;top:auto;width:auto;max-width:min(92vw,520px);";
  }
  return "bottom:0;top:auto;left:0;right:0;";
}

/**
 * Normalize banner config from either:
 * - Banner page shape: backgroundColor, textColor, description, showRejectButton, acceptText, etc.
 * - DB/template shape: message, acceptText, showReject, template, style
 * Returns fields used by the consent script generator.
 */
export function normalizeBannerConfig(config) {
  if (!config || typeof config !== "object") {
    const t = BANNER_TEMPLATES.light;
    return {
      title: DEFAULT_BANNER_CONFIG.title,
      message: DEFAULT_BANNER_CONFIG.message,
      acceptText: DEFAULT_BANNER_CONFIG.acceptText,
      rejectText: DEFAULT_BANNER_CONFIG.rejectText,
      customizeText: DEFAULT_BANNER_CONFIG.customizeText,
      showReject: true,
      position: DEFAULT_BANNER_CONFIG.position,
      style: {
        ...(t?.style || {}),
        backgroundColor: DEFAULT_BANNER_CONFIG.backgroundColor,
        textColor: DEFAULT_BANNER_CONFIG.textColor,
        buttonColor: DEFAULT_BANNER_CONFIG.buttonColor,
        buttonTextColor: DEFAULT_BANNER_CONFIG.buttonTextColor,
        padding: (t?.style?.padding || "20px"),
        fontSize: (t?.style?.fontSize || "14px"),
        borderRadius: (t?.style?.borderRadius || "8px"),
      },
    };
  }
  const template = BANNER_TEMPLATES[config.template] || BANNER_TEMPLATES.light;
  const templateStyle = template?.style || {};
  const customStyle = config.customStyle || (config.backgroundColor || config.textColor || config.buttonColor
    ? {
        backgroundColor: config.backgroundColor || templateStyle.backgroundColor || "#1f2937",
        textColor: config.textColor || templateStyle.textColor || "#ffffff",
        buttonColor: config.buttonColor || templateStyle.buttonColor || "#4F46E5",
        buttonTextColor: config.buttonTextColor || templateStyle.buttonTextColor || "#ffffff",
        padding: templateStyle.padding || "20px",
        fontSize: templateStyle.fontSize || "14px",
        borderRadius: templateStyle.borderRadius || "8px",
        border: templateStyle.border,
        boxShadow: templateStyle.boxShadow,
      }
    : null);
  const style = customStyle || templateStyle;
  return {
    title: config.title ?? DEFAULT_BANNER_CONFIG.title,
    message: config.message ?? config.description ?? DEFAULT_BANNER_CONFIG.message,
    acceptText: config.acceptText ?? config.acceptButtonText ?? DEFAULT_BANNER_CONFIG.acceptText,
    rejectText: config.rejectText ?? config.rejectButtonText ?? DEFAULT_BANNER_CONFIG.rejectText,
    customizeText: config.customizeText ?? config.customizeButtonText ?? DEFAULT_BANNER_CONFIG.customizeText,
    showReject: config.showReject !== false && config.showRejectButton !== false,
    position: config.position ?? DEFAULT_BANNER_CONFIG.position,
    style,
  };
}

// Generate banner HTML based on configuration
export function generateBannerHTML(config) {
  const template = BANNER_TEMPLATES[config.template] || BANNER_TEMPLATES.minimal;
  const style = config.customStyle || template.style;

  const positionStyle =
    config.position === "top"
      ? "top: 0; bottom: auto;"
      : "bottom: 0; top: auto;";

  return `
    <div id="cookie-banner" style="
      position: fixed;
      ${positionStyle}
      left: 0;
      right: 0;
      background: ${style.backgroundColor};
      color: ${style.textColor};
      padding: ${style.padding};
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 15px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${style.fontSize};
      ${style.border ? `border: ${style.border};` : ""}
      ${style.boxShadow ? `box-shadow: ${style.boxShadow};` : ""}
      border-radius: ${style.borderRadius};
    ">
      <div style="flex: 1; min-width: 250px;">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
          ${config.title || "🍪 We use cookies"}
        </h3>
        <p style="margin: 0; opacity: 0.9; line-height: 1.5;">
          ${config.message || "This site uses tracking cookies. Accept to enable analytics."}
        </p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button id="accept-btn" style="
          background: ${style.buttonColor};
          color: ${style.buttonTextColor};
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: ${style.fontSize};
          transition: opacity 0.2s;
        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          ${config.acceptButtonText || "Accept"}
        </button>
        ${config.showRejectButton !== false ? `
        <button id="reject-btn" style="
          background: transparent;
          color: ${style.textColor};
          border: 2px solid ${style.textColor};
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: ${style.fontSize};
          transition: opacity 0.2s;
        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          ${config.rejectButtonText || "Reject"}
        </button>
        ` : ""}
      </div>
    </div>
  `;
}
