import "./globals.css";

export const metadata = {
  title: "Cookie Consent Manager",
  description: "Detect tracking codes and manage cookie consent for your website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
