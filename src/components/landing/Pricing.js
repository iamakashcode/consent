"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState("yearly");

  return (
    <section id="pricing" className="py-10 md:py-16 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-5">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-500 mb-10">
            No hidden fees. Every plan includes a 14-day free trial.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center p-1.5 bg-slate-100 rounded-xl border border-slate-200/60 shadow-sm">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${billingCycle === "yearly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Annual billing
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {/* Basic Plan */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Basic</h3>
            <p className="text-sm text-slate-500 mb-6 h-10">Essential compliance for personal sites.</p>
            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">€{billingCycle === "monthly" ? "7" : "70"}</span>
              <span className="text-sm font-medium text-slate-500">/{billingCycle === "monthly" ? "month" : "year"}</span>
            </div>
            <a
              href="/signup"
              className="block w-full py-3.5 px-4 text-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mb-8"
            >
              Start 14-day trial
            </a>
            <ul className="space-y-4 text-sm text-slate-600">
              {["1 domain", "300,000 page views/mo", "Basic tracker detection", "Standard banner", "Community support"].map((ft) => (
                <li key={ft} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span>{ft}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Starter Plan (Highlighted) */}
          <div className="relative bg-white rounded-3xl p-8 border-2 border-indigo-600 shadow-xl shadow-indigo-500/10 md:-translate-y-4 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="bg-indigo-600 text-white text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full shadow-sm">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Starter</h3>
            <p className="text-sm text-slate-500 mb-6 h-10">Perfect for growing businesses and startups.</p>
            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">€{billingCycle === "monthly" ? "15" : "150"}</span>
              <span className="text-sm font-medium text-slate-500">/{billingCycle === "monthly" ? "month" : "year"}</span>
            </div>
            <a
              href="/signup"
              className="block w-full py-3.5 px-4 text-center text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/25 rounded-xl transition-colors mb-8 hover:-translate-y-px"
            >
              Start 14-day trial
            </a>
            <ul className="space-y-4 text-sm text-slate-600">
              {["1 domain", "700,000 page views/mo", "Advanced tracker detection", "Fully customizable banner", "Analytics dashboard", "Priority email support"].map((ft) => (
                <li key={ft} className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>{ft}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Pro</h3>
            <p className="text-sm text-slate-500 mb-6 h-10">Advanced features for high-traffic apps.</p>
            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">€{billingCycle === "monthly" ? "20" : "200"}</span>
              <span className="text-sm font-medium text-slate-500">/{billingCycle === "monthly" ? "month" : "year"}</span>
            </div>
            <a
              href="/signup"
              className="block w-full py-3.5 px-4 text-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mb-8"
            >
              Start 14-day trial
            </a>
            <ul className="space-y-4 text-sm text-slate-600">
              {["1 domain", "Unlimited page views", "All tracker types auto-blocked", "White-label banner options", "Advanced analytics API", "24/7 Priority support"].map((ft) => (
                <li key={ft} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>{ft}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
