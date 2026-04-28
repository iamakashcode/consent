import HowItWorks from "@/components/landing/HowItWorks";
import MarketingPageLayout from "@/components/landing/MarketingPageLayout";

export const metadata = {
  title: "How It Works | ConsentFlow",
  description:
    "See how ConsentFlow gets your website compliant in minutes with automated scanning, banner customization, and one-line installation.",
};

export default function HowItWorksPage() {
  return (
    <MarketingPageLayout
      title="How It Works"
      subtitle="A simple setup flow that gets you compliant in under five minutes."
    >
      <HowItWorks />
    </MarketingPageLayout>
  );
}
