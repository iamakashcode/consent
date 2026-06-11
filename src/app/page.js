import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import CertBar from "@/components/home/CertBar";
import Journey from "@/components/home/Journey";
import Bento from "@/components/home/Bento";
import Regulations from "@/components/home/Regulations";
import Security from "@/components/home/Security";
import Proof from "@/components/home/Proof";
import Pricing from "@/components/home/Pricing";
import FAQ from "@/components/home/FAQ";
import FinalCTA from "@/components/home/FinalCTA";
import Footer from "@/components/home/Footer";
import Schema from "@/components/home/Schema";
import ScrollProgress from "@/components/landing/ScrollProgress";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Organization / WebSite / SoftwareApplication JSON-LD */}
      <Schema />

      <ScrollProgress />
      <Nav />

      <main>
        {/* 1 ─ Orbital hero: kinetic type, parallax, blocked-tracker orbit */}
        <Hero />

        {/* 2 ─ Certification strip (trust) */}
        <CertBar />

        {/* 3 ─ Scroll-drawn SVG journey: the cookie follows the path */}
        <Journey />

        {/* 4 ─ Live bento grid: working demo, audit terminal, consent ring */}
        <Bento />

        {/* 5 ─ Regulation marquees on deep navy */}
        <Regulations />

        {/* 6 ─ Security + expertise (E-E-A-T: trustworthiness & authoritativeness) */}
        <Security />

        {/* 7 ─ Proof: animated counters + customer outcomes (E-E-A-T: experience) */}
        <Proof />

        {/* 8 ─ Pricing with animated gradient border */}
        <Pricing />

        {/* 9 ─ FAQ with FAQPage structured data (SEO rich results) */}
        <FAQ />

        {/* 10 ─ Final CTA with magnetic button */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
