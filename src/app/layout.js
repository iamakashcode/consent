export const metadata = {
  title: "Consent Test App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* ❌ Tracking scripts (we WANT to block these for testing) */}

        {/* Google Tag Manager */}
        <script
          async
          src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"
        ></script>

        {/* Facebook Pixel */}
        <script
          async
          src="https://connect.facebook.net/en_US/fbevents.js"
        ></script>

        {/* ✅ Our Consent Engine (must load early) */}
        <script src="/consent-sdk.js" defer></script>
      </head>

      <body>{children}</body>
    </html>
  );
}
