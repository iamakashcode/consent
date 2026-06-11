"use client";

import { useState } from "react";
import { CheckCircle2, Shield, Lock } from "lucide-react";

const plans = [
  {
    name: "Basic",
    desc: "A solid starting point for small sites and personal projects.",
    monthlyPrice: 7,
    yearlyPrice: 70,
    cta: "Start 14-day free trial",
    ctaStyle: "secondary",
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
    desc: "Everything a growing business needs to stay compliant and build user trust.",
    monthlyPrice: 15,
    yearlyPrice: 150,
    cta: "Start 14-day free trial",
    ctaStyle: "primary",
    highlight: true,
    badge: "Most popular",
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
    desc: "For high-traffic applications that need maximum coverage and zero compromise.",
    monthlyPrice: 20,
    yearlyPrice: 200,
    cta: "Start 14-day free trial",
    ctaStyle: "secondary",
    highlight: false,
    features: [
      "1 domain",
      "Unlimited page views",
      "All tracker types auto-blocked",
      "White-label banner (remove branding)",
      "Advanced analytics API",
      "Geo-targeted consent rules",
      "DPA & compliance documentation",
      "24/7 priority support",
    ],
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");

  return (
    <section id="pricing" className="relative py-16 md:py-24 bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-100/40 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
            <Shield className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs text-navy-800 tracking-wide">Transparent pricing</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy-950 mb-4 leading-snug">
            Clear plans. <span className="trust-gradient">No surprises.</span>
          </h2>
          <p className="text-slate-500 text-lg mb-10 leading-relaxed">
            Every plan includes a 14-day free trial. We earn your business by being good at our job —
            not by making it hard to leave.
          </p>

          <div className="inline-flex items-center p-1.5 glass rounded-xl">
            <button onClick={() => setBilling("monthly")} className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${billing === "monthly" ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25 font-semibold" : "text-slate-500 hover:text-navy-800"}`}>
              Monthly
            </button>
            <button onClick={() => setBilling("yearly")} className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${billing === "yearly" ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25 font-semibold" : "text-slate-500 hover:text-navy-800"}`}>
              Annual
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${billing === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {plans.map((plan, i) => (
            <div key={i} className={`relative rounded-3xl p-8 transition-all duration-300 ${plan.highlight ? "border-animated md:-translate-y-4 z-10 shadow-2xl shadow-brand-500/15" : "bg-white/80 backdrop-blur border border-brand-100 glow-card glow-card-hover hover:border-brand-300"}`}>
              {plan.badge && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="bg-brand-gradient text-white text-[11px] tracking-wide font-semibold px-4 py-1 rounded-full shadow-lg shadow-brand-500/30">{plan.badge}</span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-navy-950 mb-1">{plan.name}</h3>
              <p className="text-sm text-slate-400 mb-6 min-h-[2.5rem] leading-relaxed">{plan.desc}</p>

              <div className="mb-7 flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${plan.highlight ? "trust-gradient" : "text-navy-950"}`}>€{billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}</span>
                <span className="text-sm text-slate-400">/{billing === "monthly" ? "mo" : "yr"}</span>
                {billing === "yearly" && (
                  <span className="ml-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Save 20%</span>
                )}
              </div>

              <a href="/signup" className={`block w-full py-3.5 text-center text-sm font-semibold rounded-xl transition-all duration-200 mb-7 ${plan.ctaStyle === "primary" ? "btn-brand shine" : "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/60"}`}>
                {plan.cta}
              </a>

              <ul className="space-y-3.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-brand-500" : "text-brand-400"}`} />
                    <span className="text-slate-500 leading-snug">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {[
            { icon: Shield, text: "14-day free trial on all plans" },
            { icon: Lock, text: "Payments secured by Paddle" },
            { icon: CheckCircle2, text: "Cancel anytime, no questions asked" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-slate-400">
              <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
