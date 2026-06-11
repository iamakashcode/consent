import MarketingPageLayout from "@/components/landing/MarketingPageLayout";

export const metadata = {
  title: "Refund Policy",
  description:
    "Review Cookie Access refund eligibility, timelines, and how to request a refund.",
};

export default function RefundPolicyPage() {
  return (
    <MarketingPageLayout
      title="Refund Policy"
      subtitle="This policy explains when and how refunds can be requested."
    >
      <h2>1. Eligibility</h2>
      <p>
        Refunds may be considered for first-time purchases within the eligible
        refund window as specified at checkout.
      </p>

      <h2>2. Non-Refundable Cases</h2>
      <p>
        Charges for renewals, overage usage, taxes, and services already
        consumed may not be eligible for refund unless required by law.
      </p>

      <h2>3. Request Process</h2>
      <p>
        To request a refund, contact support with your account email, order
        details, and reason for the request.
      </p>

      <h2>4. Review and Approval</h2>
      <p>
        Our billing team reviews requests case-by-case and may request
        additional information before issuing a decision.
      </p>

      <h2>5. Processing Time</h2>
      <p>
        Approved refunds are typically processed within 5 to 10 business days,
        depending on your payment provider.
      </p>
    </MarketingPageLayout>
  );
}
