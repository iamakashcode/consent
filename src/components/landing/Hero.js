"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield } from "lucide-react";

const DashboardPreview = () => (
  <div className="relative">
    {/* Glow effect */}
    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 rounded-3xl blur-2xl" />

    {/* Browser frame */}
    <div className="relative rounded-2xl border border-slate-200/80 shadow-2xl shadow-indigo-500/10 bg-white overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 border-b border-slate-200/80">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 mx-3">
          <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 max-w-xs truncate">
            app.consentflow.io/dashboard
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-5 bg-slate-50/50 space-y-4">
        {/* Top metric row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active Domains", value: "12", change: "+2", up: true },
            { label: "Page Views", value: "248K", change: "+18%", up: true },
            { label: "Consent Rate", value: "94%", change: "+3.2%", up: true },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200/70 p-3.5 shadow-sm">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">{m.label}</p>
              <p className="text-xl font-bold text-slate-900 leading-none">{m.value}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">{m.change}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-700">Consent Rate Over Time</p>
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-md">Last 7 days</span>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {[55, 72, 60, 85, 68, 92, 88].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 opacity-90"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="text-[9px] text-slate-400 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 mb-3">Recent Domains</p>
          <div className="space-y-2">
            {[
              { domain: "myshop.com", status: "Active", rate: "96%" },
              { domain: "blog.io", status: "Active", rate: "91%" },
            ].map((d) => (
              <div key={d.domain} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-700">{d.domain}</span>
                </div>
                <span className="text-xs font-semibold text-indigo-600">{d.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function Hero() {
  return (
    <section className="relative pt-20 pb-20 lg:pt-36 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-violet-100/60 via-indigo-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-indigo-100/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-8">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-700 tracking-wide">GDPR & CCPA Compliant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-[3.75rem] font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
              Cookie Consent
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            {/* Sub */}
            <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-[440px]">
              Auto-detect trackers, block until consent, and stay compliant with GDPR, CCPA, and ePrivacy — without touching your code.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all duration-200"
              >
                See How It Works
              </a>
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
              {["14-day free trial", "No credit card", "Cancel anytime"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard preview */}
          <div className="lg:pl-8">
            <DashboardPreview />
          </div>
        </div>

        {/* Trusted by bar */}
        <div className="mt-10 pt-10 border-t border-slate-100">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
            {["Shopify", "Vercel", "Webflow", "Framer", "Ghost"].map((b) => (
              <span key={b} className="text-slate-300 font-semibold text-lg tracking-tight hover:text-slate-400 transition-colors cursor-default">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
