import MarketingPageLayout from "@/components/landing/MarketingPageLayout";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Cookie Access collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <MarketingPageLayout
      title="Privacy Policy"
      subtitle="Your privacy matters to us. This policy outlines how your data is handled."
    >
      <h2>1. Information We Collect</h2>
      <p>
        We collect information you provide directly, such as account details,
        and technical data required to deliver and improve our services.
      </p>

      <h2>2. How We Use Information</h2>
      <p>
        Information is used to provide support, process subscriptions, improve
        service performance, and maintain security and compliance.
      </p>

      <h2>3. Data Sharing</h2>
      <p>
        We do not sell personal information. We may share data with trusted
        service providers only as needed to operate Cookie Access.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        We retain information only as long as needed for business and legal
        purposes, then securely delete or anonymize it.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct,
        delete, or restrict processing of your personal data.
      </p>

      <h2>6. Contact</h2>
      <p>
        For privacy-related requests, please contact our support team through
        the official Cookie Access support channels.
      </p>
    </MarketingPageLayout>
  );
}
