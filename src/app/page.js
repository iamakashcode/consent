import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import Stats from "@/components/landing/Stats";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import LiveDemo from "@/components/landing/LiveDemo";
import ComplianceCoverage from "@/components/landing/ComplianceCoverage";
import SecuritySection from "@/components/landing/SecuritySection";
import Showcase from "@/components/landing/Showcase";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";
import RevealOnScroll from "@/components/landing/RevealOnScroll";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Scroll progress bar — fixed at very top */}
      <ScrollProgress />

      {/* Global scroll-reveal handler */}
      <RevealOnScroll />

      <Header />

      <main>
        {/* 1 ─ Trust-first hero: animated orbs, typewriter, live dashboard, marquee */}
        <Hero />

        {/* 2 ─ Certification authority strip */}
        <div className="reveal">
          <TrustBar />
        </div>

        {/* 3 ─ Animated counter stats */}
        <div className="reveal">
          <Stats />
        </div>

        {/* 4 ─ The cost of inaction — dark emotional hook */}
        <div className="reveal">
          <Problem />
        </div>

        {/* 5 ─ Transparent 3-step process */}
        <div className="reveal">
          <HowItWorks />
        </div>

        {/* 6 ─ Full feature set with tab filter + 3D tilt cards */}
        <Features />

        {/* 7 ─ Interactive consent banner live demo */}
        <div className="reveal">
          <LiveDemo />
        </div>

        {/* 8 ─ Global regulation coverage */}
        <div className="reveal">
          <ComplianceCoverage />
        </div>

        {/* 9 ─ Security & privacy deep trust */}
        <div className="reveal">
          <SecuritySection />
        </div>

        {/* 10 ─ Dashboard analytics preview */}
        <div className="reveal">
          <Showcase />
        </div>

        {/* 11 ─ Customer stories with before/after metrics */}
        <div className="reveal">
          <Testimonials />
        </div>

        {/* 12 ─ Transparent pricing with trust signals */}
        <div className="reveal">
          <Pricing />
        </div>

        {/* 13 ─ Expert FAQ — EEAT expertise */}
        <div className="reveal">
          <FAQ />
        </div>

        {/* 14 ─ Final trust CTA */}
        <div className="reveal">
          <CTA />
        </div>
      </main>

      <Footer />
    </div>
  );
}
