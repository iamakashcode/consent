import MarketingPageLayout from "@/components/landing/MarketingPageLayout";

export const metadata = {
  title: "Terms and Condition | ConsentFlow",
  description:
    "Read the terms and condition governing your use of ConsentFlow services.",
};

export default function TermsAndConditionPage() {
  return (
    <MarketingPageLayout
      title="Terms and Condition"
      subtitle="Please review these terms carefully before using ConsentFlow."
    >
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using ConsentFlow, you agree to be bound by these Terms
        and Condition and all applicable laws and regulations.
      </p>

      <h2>2. Use of Services</h2>
      <p>
        You agree to use the platform only for lawful purposes and in
        compliance with applicable privacy and data protection regulations.
      </p>

      <h2>3. Account Responsibilities</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account
        credentials and for all activities that occur under your account.
      </p>

      <h2>4. Subscription and Billing</h2>
      <p>
        Paid services are billed according to your selected plan. Failure to
        pay may result in suspension or termination of access.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        ConsentFlow is provided on an &quot;as is&quot; basis. To the fullest extent
        permitted by law, we are not liable for indirect or consequential
        damages arising from use of the service.
      </p>

      <h2>6. Changes to Terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the
        service after updates indicates your acceptance of the revised terms.
      </p>
    </MarketingPageLayout>
  );
}
