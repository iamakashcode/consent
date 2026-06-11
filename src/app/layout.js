import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  metadataBase: new URL("https://cookieaccess.io"),
  title: {
    default: "Cookie Access — Cookie Consent Management for GDPR, CCPA & ePrivacy",
    template: "%s | Cookie Access",
  },
  description:
    "Auto-detect 200+ trackers, block them until consent, and keep a court-ready GDPR Article 7 audit trail. Brand-matched cookie banners live in under 5 minutes — with less than 1ms page-load impact.",
  keywords: [
    "cookie consent",
    "consent management platform",
    "GDPR compliance",
    "CCPA compliance",
    "cookie banner",
    "ePrivacy",
    "consent audit log",
    "tracker blocking",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://cookieaccess.io",
    siteName: "Cookie Access",
    title: "Cookie Access — Cookie consent, reimagined",
    description:
      "One script blocks every tracker until your visitors say yes — then proves it with an audit trail regulators actually accept.",
    images: [{ url: "/cookie-access-logo.png", width: 1200, height: 630, alt: "Cookie Access" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Access — Cookie consent, reimagined",
    description:
      "Auto-detect trackers, block until consent, stay compliant with GDPR, CCPA & ePrivacy — in minutes, not months.",
    images: ["/cookie-access-logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
