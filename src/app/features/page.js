import Features from "@/components/landing/Features";
import MarketingPageLayout from "@/components/landing/MarketingPageLayout";

export const metadata = {
  title: "Features | ConsentFlow",
  description:
    "Explore all ConsentFlow features for cookie consent compliance, script blocking, analytics, and multi-domain management.",
};

export default function FeaturesPage() {
  return (
    <MarketingPageLayout
      title="Features"
      subtitle="Everything you need to launch compliant consent across your websites."
    >
      <Features />
    </MarketingPageLayout>
  );
}
