"use client";

import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";
import Link from "next/link";
import { Fragment, useState } from "react";
import {
  CheckCircle2, X, Shield, Lock, Zap, Globe, ArrowRight,
  ChevronDown, Star, Users, Headphones, FileCheck,
  Building2, MessageSquare, BarChart3,
} from "lucide-react";

const plans = [
  {
    name: "Basic",
    tagline: "For personal sites & side projects",
    monthlyPrice: 7,
    yearlyPrice: 70,
    cta: "Start free trial",
    highlight: false,
    features: [
      "1 domain",
      "300,000 page views / month",
      "Basic tracker auto-detection",
      "Standard consent banner",
      "GDPR & CCPA templates",
      "Community support",
    ],
  },
  {
    name: "Starter",
    tagline: "For growing businesses",
    monthlyPrice: 15,
    yearlyPrice: 150,
    badge: "Most popular",
    cta: "Start free trial",
    highlight: true,
    features: [
      "1 domain",
      "700,000 page views / month",
      "Advanced tracker detection",
      "Fully custom-branded banner",
      "All global regulation templates",
      "Real-time analytics dashboard",
      "Consent audit logs",
      "Priority email support",
    ],
  },
  {
    name: "Pro",
    tagline: "For high-traffic applications",
    monthlyPrice: 20,
    yearlyPrice: 200,
    cta: "Start free trial",
    highlight: false,
    features: [
      "1 domain",
      "Unlimited page views",
      "All tracker types auto-blocked",
      "White-label banner",
      "Advanced analytics API",
      "Geo-targeted consent rules",
      "DPA & compliance documentation",
      "24/7 priority support",
    ],
  },
];

const tableFeatures = [
  {
    category: "Core",
    rows: [
      { label: "Custom domains", basic: "1", starter: "1", pro: "Unlimited" },
      { label: "Monthly page views", basic: "300K", starter: "700K", pro: "Unlimited" },
      { label: "Consent banner", basic: true, starter: true, pro: true },
      { label: "Custom branding", basic: false, starter: true, pro: true },
      { label: "White-label (remove badge)", basic: false, starter: false, pro: true },
      { label: "A/B test banner variants", basic: false, starter: true, pro: true },
    ],
  },
  {
    category: "Compliance",
    rows: [
      { label: "GDPR / CCPA templates", basic: true, starter: true, pro: true },
      { label: "All global regulation templates", basic: false, starter: true, pro: true },
      { label: "Geo-targeted consent rules", basic: false, starter: false, pro: true },
      { label: "Auto tracker detection", basic: "Basic", starter: "Advanced", pro: "Full" },
      { label: "Consent audit logs", basic: false, starter: true, pro: true },
      { label: "DPA documentation", basic: false, starter: false, pro: true },
    ],
  },
  {
    category: "Analytics",
    rows: [
      { label: "Real-time dashboard", basic: false, starter: true, pro: true },
      { label: "Analytics API", basic: false, starter: false, pro: true },
      { label: "Export consent data", basic: false, starter: true, pro: true },
      { label: "Data retention", basic: "30 days", starter: "90 days", pro: "Unlimited" },
    ],
  },
  {
    category: "Support",
    rows: [
      { label: "Community support", basic: true, starter: true, pro: true },
      { label: "Priority email support", basic: false, starter: true, pro: true },
      { label: "24/7 support", basic: false, starter: false, pro: true },
      { label: "Dedicated account manager", basic: false, starter: false, pro: false },
    ],
  },
];

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade or downgrade from your billing settings at any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.",
  },
  {
    q: "What happens if I exceed my page view limit?",
    a: "We'll email you at 80% and 100% usage. Your banner keeps serving — we never break your compliance. Overages are billed at a flat per-1,000-view rate.",
  },
  {
    q: "Is a credit card required for the free trial?",
    a: "No. Every plan comes with a 14-day free trial and no card is required to start. You only pay if you decide to continue.",
  },
  {
    q: "Is there a discount for agencies managing multiple sites?",
    a: "Yes — our Agency plan (coming soon) covers up to 50 domains under one subscription. Contact us if you need multi-domain pricing today.",
  },
  {
    q: "How are payments processed?",
    a: "Payments are handled by Paddle, a Merchant of Record. All major cards, PayPal, and regional payment methods are supported. We never store card details.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 30-day money-back guarantee on first-time purchases. See our Refund Policy for full details and eligibility.",
  },
];

function CellValue({ v }) {
  if (v === true) return <CheckCircle2 className="w-4 h-4 text-brand-500 mx-auto" />;
  if (v === false) return <X className="w-4 h-4 text-slate-300 mx-auto" />;
  return <span className="text-xs font-semibold text-slate-600">{v}</span>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-white font-sans">
      <ScrollProgress />
      <Nav />

      <main>
        {/* ─── Hero ─── */}
        <section className="noise relative pt-36 pb-44 overflow-hidden bg-aurora">
          <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />
          <div className="absolute top-[-120px] right-[-120px] w-[560px] h-[560px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(183,83,239,0.14) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-140px] left-[-140px] w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(18,11,125,0.1) 0%, transparent 70%)" }} />

          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <div className="glass inline-flex items-center gap-2 text-xs font-semibold text-navy-800 px-4 py-2 rounded-full mb-7">
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              Transparent pricing — no hidden fees, ever
            </div>
            <h1 className="font-display font-bold text-navy-950 text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.02] mb-5">
              Simple pricing,{" "}
              <span className="trust-gradient">serious compliance.</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-xl mx-auto">
              Every plan ships with a 14-day free trial. We earn your business by being good at our
              job — not by making it hard to leave.
            </p>

            {/* Billing toggle */}
            <div className="glass inline-flex items-center p-1.5 rounded-2xl">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  billing === "monthly"
                    ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25"
                    : "text-slate-500 hover:text-navy-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  billing === "yearly"
                    ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25"
                    : "text-slate-500 hover:text-navy-900"
                }`}
              >
                Annual
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                  billing === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                }`}>
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ─── Pricing cards (float over the hero boundary) ─── */}
        <section className="relative pb-8 -mt-28">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6 items-end relative z-10">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-8 transition-all duration-300 ${
                    plan.highlight
                      ? "border-animated md:-translate-y-6"
                      : "bg-white border border-brand-100 glow-card glow-card-hover hover:border-brand-300"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-brand-gradient text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30">
                        <Star className="w-3 h-3 fill-white" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="font-display text-xl font-bold text-navy-950 mb-1">{plan.name}</h3>
                    <p className="text-sm text-slate-400">{plan.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`font-display text-5xl font-bold tracking-tight ${plan.highlight ? "trust-gradient" : "text-navy-950"}`}>
                      €{billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="text-sm ml-1 text-slate-400">/{billing === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  <p className="text-xs mb-6 h-4 text-emerald-600 font-medium">
                    {billing === "yearly" ? "Billed annually — 2 months free" : ""}
                  </p>

                  <Link
                    href="/signup"
                    className={`block w-full py-3.5 text-center text-sm font-bold rounded-2xl transition-all duration-200 mb-8 ${
                      plan.highlight
                        ? "btn-brand shine"
                        : "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/60"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-500" />
                        <span className="text-slate-500">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Enterprise strip */}
            <div className="mt-6 glass rounded-3xl p-7 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="icon-tile w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-navy-950 mb-1">Enterprise</h3>
                  <p className="text-sm text-slate-500">
                    Custom domains · SSO · SLA guarantees · Dedicated support · Custom DPA for your legal team
                  </p>
                </div>
              </div>
              <Link
                href="/contact-us"
                className="btn-brand shine flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl whitespace-nowrap"
              >
                Talk to sales
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Trust signals ─── */}
        <section className="py-10 border-b border-brand-100/60 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
              {[
                { icon: Shield, text: "14-day free trial on all plans" },
                { icon: Lock, text: "Payments secured by Paddle" },
                { icon: CheckCircle2, text: "Cancel anytime, no questions asked" },
                { icon: FileCheck, text: "SOC 2 Type II certified" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Feature comparison table ─── */}
        <section className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">
                Full comparison
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 tracking-tight mb-4">
                Compare <span className="trust-gradient">every feature.</span>
              </h2>
              <p className="text-slate-500 text-lg">No fine print. See exactly what&apos;s included.</p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-brand-100 glow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-50/60 border-b border-brand-100">
                    <th className="text-left py-5 px-6 text-slate-500 font-medium w-[42%]">Feature</th>
                    {["Basic", "Starter", "Pro"].map((p, i) => (
                      <th key={p} className="py-5 px-4 text-center">
                        <span
                          className={`font-display inline-block text-sm font-bold px-3.5 py-1.5 rounded-lg ${
                            i === 1 ? "bg-brand-gradient text-white shadow-md shadow-brand-500/30" : "text-navy-900"
                          }`}
                        >
                          {p}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableFeatures.map(({ category, rows }) => (
                    <Fragment key={category}>
                      <tr className="bg-brand-50/40">
                        <td
                          colSpan={4}
                          className="py-3 px-6 text-[11px] font-bold text-brand-600 uppercase tracking-widest"
                        >
                          {category}
                        </td>
                      </tr>
                      {rows.map(({ label, basic, starter, pro }) => (
                        <tr
                          key={label}
                          className="border-t border-brand-50 hover:bg-brand-50/30 transition-colors"
                        >
                          <td className="py-4 px-6 text-slate-600 font-medium">{label}</td>
                          <td className="py-4 px-4 text-center">
                            <CellValue v={basic} />
                          </td>
                          <td className="py-4 px-4 text-center bg-brand-50/40">
                            <CellValue v={starter} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <CellValue v={pro} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-24 bg-gradient-to-b from-brand-50/40 to-white">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">FAQ</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 tracking-tight mb-4">
                Pricing <span className="trust-gradient">questions.</span>
              </h2>
              <p className="text-slate-500 text-lg">Everything you need to know before signing up.</p>
            </div>

            <div className="space-y-3">
              {faqs.map(({ q, a }, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-display font-bold text-navy-950 text-[15px] leading-snug">{q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180 text-brand-600" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <div className="h-px bg-gradient-to-r from-brand-200/60 to-transparent mb-4" />
                      <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Enterprise CTA ─── */}
        <section className="relative py-28 overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-900">
          <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
          <div className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-500/20 blur-[110px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-5%] w-[450px] h-[450px] rounded-full bg-navy-400/20 blur-[100px] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-14 items-center">
              <div>
                <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-300 mb-5">
                  Enterprise
                </p>
                <h2 className="font-display text-4xl font-bold text-white mb-5 leading-tight">
                  Need a custom plan for your organisation?
                </h2>
                <p className="text-navy-100/60 text-base leading-relaxed mb-8">
                  We work with agencies, SaaS companies, and large enterprises to build pricing that fits. Custom
                  domains, SSO, dedicated SLAs, and a legal team-ready DPA included.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact-us"
                    className="shine inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-navy-900 bg-white rounded-xl hover:bg-brand-50 shadow-xl transition-all duration-200 hover:-translate-y-px"
                  >
                    Talk to sales
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/partners"
                    className="glass-dark inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-medium text-white rounded-xl hover:bg-brand-500/20 transition-all duration-200"
                  >
                    Agency & partner plans
                  </Link>
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  { icon: Users, label: "Unlimited team seats" },
                  { icon: Globe, label: "Custom domain bundles" },
                  { icon: Shield, label: "Dedicated SLA & uptime guarantee" },
                  { icon: FileCheck, label: "Data Processing Agreement (DPA)" },
                  { icon: BarChart3, label: "Advanced analytics & reporting" },
                  { icon: Headphones, label: "Named account manager" },
                  { icon: MessageSquare, label: "Slack Connect support channel" },
                  { icon: Zap, label: "Priority feature requests" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="glass-dark w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-300" />
                    </div>
                    <span className="text-sm font-medium text-navy-100/70">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
