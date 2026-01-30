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

// Default banner configuration – must match banner page DEFAULT_CONFIG so first-time script matches preview
export const DEFAULT_BANNER_CONFIG = {
  template: "minimal",
  position: "bottom",
  title: "We value your privacy",
  message: "This site uses tracking cookies to enhance your browsing experience and analyze site traffic.",
  acceptButtonText: "Accept All",
  rejectButtonText: "Reject All",
  customizeButtonText: "Customize",
  showRejectButton: true,
  showCustomizeButton: true,
  customStyle: null,
};

/**
 * Normalize banner config from either:
 * - Banner page shape: backgroundColor, textColor, description, showRejectButton, acceptText, etc.
 * - DB/template shape: message, acceptText, showReject, template, style
 * Returns { title, message, acceptText, rejectText, showReject, position, style } for script generation.
 */
export function normalizeBannerConfig(config) {
  if (!config || typeof config !== "object") {
    const t = BANNER_TEMPLATES.minimal;
    return {
      title: "We value your privacy",
      message: "This site uses tracking cookies to enhance your browsing experience and analyze site traffic.",
      acceptText: "Accept All",
      rejectText: "Reject All",
      showReject: true,
      position: "bottom",
      style: t?.style || {
        backgroundColor: "#1f2937",
        textColor: "#ffffff",
        buttonColor: "#4F46E5",
        buttonTextColor: "#ffffff",
        padding: "20px",
        fontSize: "14px",
        borderRadius: "8px",
      },
    };
  }
  const template = BANNER_TEMPLATES[config.template] || BANNER_TEMPLATES.minimal;
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
    title: config.title ?? "We value your privacy",
    message: config.message ?? config.description ?? "This site uses tracking cookies to enhance your browsing experience and analyze site traffic.",
    acceptText: config.acceptText ?? config.acceptButtonText ?? "Accept All",
    rejectText: config.rejectText ?? config.rejectButtonText ?? "Reject All",
    showReject: config.showReject !== false && config.showRejectButton !== false,
    position: config.position ?? "bottom",
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
