"use client";

import { Shield } from "lucide-react";

const ROW_A = ["GDPR · EU", "CCPA · California", "ePrivacy · EU", "LGPD · Brazil", "PDPA · Singapore", "PIPEDA · Canada"];
const ROW_B = ["APPI · Japan", "NDPR · Nigeria", "CPRA · California", "PDPA · Thailand", "DPDP · India", "POPIA · South Africa"];

function Chip({ label }) {
  return (
    <span className="glass-dark inline-flex items-center gap-2 rounded-xl px-5 py-2.5 mx-2 whitespace-nowrap">
      <Shield className="w-3.5 h-3.5 text-brand-300" />
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-brand-300 text-xs">✓</span>
    </span>
  );
}

export default function Regulations() {
  return (
    <section id="coverage" className="relative py-24 overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-900">
      <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
      <div className="absolute top-[-80px] left-1/3 w-[500px] h-[300px] bg-brand-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-3xl mx-auto text-center px-6 mb-12">
        <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-300 mb-4">Global coverage</p>
        <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-[1.04] mb-5">
          Every law.<br />
          <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-300 bg-clip-text text-transparent">One script.</span>
        </h2>
        <p className="text-navy-100/60 text-lg">
          130+ countries, 12 major regulations, updated by our legal team the day laws change — not the quarter after.
        </p>
      </div>

      {/* Opposing marquees */}
      <div className="relative space-y-4" aria-hidden="true">
        <div className="overflow-hidden">
          <div className="animate-marquee" style={{ animationDuration: "30s" }}>
            {[...ROW_A, ...ROW_A].map((r, i) => <Chip key={i} label={r} />)}
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="animate-marquee-reverse" style={{ animationDuration: "34s" }}>
            {[...ROW_B, ...ROW_B].map((r, i) => <Chip key={i} label={r} />)}
          </div>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-6 mt-14 grid grid-cols-3 gap-6 text-center">
        {[
          ["130+", "countries"],
          ["12", "regulations"],
          ["0", "lawyers needed"],
        ].map(([v, l]) => (
          <div key={l}>
            <p className="font-display text-4xl font-bold bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent mb-1">{v}</p>
            <p className="text-xs text-navy-100/50 uppercase tracking-widest">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
