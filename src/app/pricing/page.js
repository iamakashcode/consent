"use client";

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import Link from "next/link";
import { useState } from "react";
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
  if (v === true) return <CheckCircle2 className="w-4 h-4 text-teal-500 mx-auto" />;
  if (v === false) return <X className="w-4 h-4 text-slate-300 mx-auto" />;
  return <span className="text-xs font-semibold text-slate-600">{v}</span>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative pt-24 pb-24 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
          <div className="absolute inset-0 pointer-events-none">
            <div className="animate-orb1 absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[90px]" />
            <div className="animate-orb2 absolute top-10 right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[80px]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-8">
              <Shield className="w-3.5 h-3.5" />
              Transparent pricing — no hidden fees, ever
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-5 leading-[1.1]">
              Simple pricing,{" "}
              <span className="bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">
                serious compliance
              </span>
            </h1>
            <p className="text-lg text-blue-200/80 leading-relaxed mb-10 max-w-xl mx-auto">
              Every plan ships with a 14-day free trial. We earn your business by being good at our job — not by making
              it hard to leave.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center p-1.5 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  billing === "monthly"
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-blue-300 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  billing === "yearly"
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-blue-300 hover:text-white"
                }`}
              >
                Annual
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ─── Pricing Cards (float over the dark→white boundary) ─── */}
        <section className="relative bg-gradient-to-b from-slate-950 to-white pb-8">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-5 pt-0 items-end relative z-10">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-8 transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gradient-to-b from-blue-500 to-blue-700 shadow-2xl shadow-blue-900/60 md:-translate-y-8 border border-blue-400/40"
                      : "bg-slate-800/60 backdrop-blur-sm border border-white/10 hover:bg-slate-700/60"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg">
                        <Star className="w-3 h-3 fill-amber-900" />
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className={`text-sm ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-extrabold text-white tracking-tight">
                      €{billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className={`text-sm ml-1 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                      /{billing === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  <p className={`text-xs mb-6 h-4 ${billing === "yearly" ? (plan.highlight ? "text-blue-200" : "text-emerald-400") : ""}`}>
                    {billing === "yearly" ? "Billed annually — 2 months free" : ""}
                  </p>

                  <Link
                    href="/signup"
                    className={`block w-full py-3.5 text-center text-sm font-bold rounded-xl transition-all duration-200 mb-8 ${
                      plan.highlight
                        ? "bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            plan.highlight ? "text-teal-300" : "text-teal-500/70"
                          }`}
                        />
                        <span className={plan.highlight ? "text-blue-100" : "text-slate-300"}>
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Enterprise strip */}
            <div className="mt-5 bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-3xl p-7 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Enterprise</h3>
                  <p className="text-sm text-slate-400">
                    Custom domains · SSO · SLA guarantees · Dedicated support · Custom DPA for your legal team
                  </p>
                </div>
              </div>
              <Link
                href="/contact-us"
                className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/20 rounded-xl hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Talk to sales
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Trust signals ─── */}
        <section className="py-10 border-b border-slate-100 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
              {[
                { icon: Shield, text: "14-day free trial on all plans" },
                { icon: Lock, text: "Payments secured by Paddle" },
                { icon: CheckCircle2, text: "Cancel anytime, no questions asked" },
                { icon: FileCheck, text: "SOC 2 Type II certified" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-400">
                  <Icon className="w-4 h-4 text-teal-500 flex-shrink-0" />
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
              <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full mb-5">
                Full comparison
              </span>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Compare every feature
              </h2>
              <p className="text-slate-500 text-lg">No fine print. See exactly what's included.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-5 px-6 text-slate-500 font-medium w-[42%]">Feature</th>
                    {["Basic", "Starter", "Pro"].map((p, i) => (
                      <th key={p} className="py-5 px-4 text-center">
                        <span
                          className={`inline-block text-sm font-bold px-3 py-1.5 rounded-lg ${
                            i === 1 ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-700"
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
                    <>
                      <tr key={category} className="bg-slate-50/80">
                        <td
                          colSpan={4}
                          className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest"
                        >
                          {category}
                        </td>
                      </tr>
                      {rows.map(({ label, basic, starter, pro }) => (
                        <tr
                          key={label}
                          className="border-t border-slate-50 hover:bg-blue-50/20 transition-colors"
                        >
                          <td className="py-4 px-6 text-slate-600 font-medium">{label}</td>
                          <td className="py-4 px-4 text-center">
                            <CellValue v={basic} />
                          </td>
                          <td className="py-4 px-4 text-center bg-blue-50/30">
                            <CellValue v={starter} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <CellValue v={pro} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full mb-5">
                FAQ
              </span>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">Pricing questions</h2>
              <p className="text-slate-500 text-lg">Everything you need to know before signing up.</p>
            </div>

            <div className="space-y-3">
              {faqs.map(({ q, a }, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <span className="font-semibold text-slate-800 text-sm leading-snug">{q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180 text-blue-500" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 border-t border-slate-50">
                      <p className="pt-4 text-sm text-slate-500 leading-relaxed">{a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Enterprise CTA ─── */}
        <section className="relative py-28 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
          <div className="absolute inset-0 pointer-events-none">
            <div className="animate-orb1 absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/25 blur-[100px]" />
            <div className="animate-orb2 absolute bottom-[-20%] left-[-5%] w-[450px] h-[450px] rounded-full bg-violet-600/20 blur-[90px]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-14 items-center">
              <div>
                <span className="inline-block text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-6">
                  Enterprise
                </span>
                <h2 className="text-4xl font-bold text-white mb-5 leading-tight">
                  Need a custom plan for your organisation?
                </h2>
                <p className="text-blue-200/80 text-base leading-relaxed mb-8">
                  We work with agencies, SaaS companies, and large enterprises to build pricing that fits. Custom
                  domains, SSO, dedicated SLAs, and a legal team-ready DPA included.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact-us"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold text-blue-950 bg-white rounded-xl hover:bg-blue-50 shadow-xl transition-all duration-200 hover:-translate-y-px"
                  >
                    Talk to sales
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/partners"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-medium text-blue-200 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-all duration-200"
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
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-300" />
                    </div>
                    <span className="text-sm font-medium text-blue-100/80">{label}</span>
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
