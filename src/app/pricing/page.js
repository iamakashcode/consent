import Pricing from "@/components/landing/Pricing";
import MarketingPageLayout from "@/components/landing/MarketingPageLayout";

export const metadata = {
  title: "Pricing | ConsentFlow",
  description:
    "Compare ConsentFlow plans and choose the right pricing for your website's consent management and compliance needs.",
};

export default function PricingPage() {
  return (
    <MarketingPageLayout
      title="Pricing"
      subtitle="Transparent plans that scale from personal websites to high-traffic businesses."
    >
      <Pricing />
    </MarketingPageLayout>
  );
}
