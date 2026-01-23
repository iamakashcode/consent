import "./globals.css";
import { Providers } from "./providers";
import Navigation from "@/components/Navigation";

export const metadata = {
  title: "Cookie Consent Manager",
  description: "Detect tracking codes and manage cookie consent for your website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
