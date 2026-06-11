const SITE = "https://cookieaccess.io";

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Cookie Access",
  url: SITE,
  logo: `${SITE}/cookie-access-logo.png`,
  description:
    "Cookie Access is a consent management platform that auto-detects trackers, blocks them until consent, and keeps an immutable audit trail for GDPR, CCPA, and other privacy regulations.",
  email: "support@cookieaccess.io",
  sameAs: [],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Cookie Access",
  url: SITE,
};

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cookie Access",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Consent management platform: automatic tracker detection, script blocking until consent, brand-matched banners, real-time analytics, and GDPR Article 7 audit logs.",
  url: SITE,
  offers: [
    { "@type": "Offer", name: "Basic", price: "7", priceCurrency: "EUR", category: "subscription" },
    { "@type": "Offer", name: "Starter", price: "15", priceCurrency: "EUR", category: "subscription" },
    { "@type": "Offer", name: "Pro", price: "20", priceCurrency: "EUR", category: "subscription" },
  ],
  featureList: [
    "Automatic tracker detection (200+ trackers)",
    "Script blocking until consent",
    "GDPR, CCPA, ePrivacy, LGPD templates",
    "Consent audit logs",
    "Real-time analytics",
    "Geo-targeted consent rules",
    "30+ languages",
  ],
};

export default function Schema() {
  return (
    <>
      {[organization, website, softwareApplication].map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
    </>
  );
}
