"use client";

import { useState } from "react";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Basic",
    monthly: 7,
    yearly: 70,
    tag: "Side projects",
    features: ["1 domain", "300K page views/mo", "Tracker auto-detection", "GDPR & CCPA templates", "Community support"],
  },
  {
    name: "Starter",
    monthly: 15,
    yearly: 150,
    tag: "Growing businesses",
    featured: true,
    features: ["1 domain", "700K page views/mo", "Custom-branded banner", "All regulation templates", "Real-time analytics", "Consent audit logs", "Priority support"],
  },
  {
    name: "Pro",
    monthly: 20,
    yearly: 200,
    tag: "High traffic",
    features: ["1 domain", "Unlimited page views", "White-label banner", "Analytics API", "Geo-targeted rules", "DPA documentation", "24/7 support"],
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-brand-100/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">Pricing</p>
            <h2 className="font-display text-4xl md:text-6xl font-bold text-navy-950 leading-[1.04]">
              Honest plans.<br />
              <span className="trust-gradient">Zero surprises.</span>
            </h2>
          </div>

          <div className="glass inline-flex items-center self-start md:self-auto p-1.5 rounded-2xl">
            <button onClick={() => setYearly(false)} className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${!yearly ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25" : "text-slate-500 hover:text-navy-900"}`}>
              Monthly
            </button>
            <button onClick={() => setYearly(true)} className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${yearly ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25" : "text-slate-500 hover:text-navy-900"}`}>
              Yearly
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${yearly ? "bg-white/20" : "bg-emerald-100 text-emerald-700"}`}>−20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl p-8 ${
                p.featured
                  ? "border-animated"
                  : "bg-white border border-brand-100 glow-card glow-card-hover hover:border-brand-300 transition-all duration-300"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 bg-brand-gradient text-white text-[11px] font-bold tracking-wide px-3.5 py-1 rounded-full shadow-lg shadow-brand-500/30">
                  MOST POPULAR
                </span>
              )}
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display text-xl font-bold text-navy-950">{p.name}</h3>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{p.tag}</span>
              </div>

              <div className="flex items-baseline gap-1.5 my-6">
                <span className={`font-display text-6xl font-bold leading-none ${p.featured ? "trust-gradient" : "text-navy-950"}`}>
                  €{yearly ? p.yearly : p.monthly}
                </span>
                <span className="text-sm text-slate-400">/{yearly ? "yr" : "mo"}</span>
              </div>

              <a
                href="/signup"
                className={`block w-full py-3.5 text-center text-sm font-semibold rounded-2xl mb-7 transition-all ${
                  p.featured ? "btn-brand shine" : "bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/60"
                }`}
              >
                Start 14-day free trial
              </a>

              <ul className="space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-500">
                    <span className="icon-tile-soft w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          14-day free trial on every plan · no credit card · cancel in two clicks
        </p>
      </div>
    </section>
  );
}
