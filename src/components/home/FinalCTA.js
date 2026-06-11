"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  const btnRef = useRef(null);

  // Magnetic button — follows the cursor slightly
  const onMove = (e) => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.25;
    const y = (e.clientY - r.top - r.height / 2) * 0.35;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => {
    const el = btnRef.current;
    if (el) el.style.transform = "translate(0,0)";
  };

  return (
    <section className="noise relative py-28 md:py-36 overflow-hidden bg-aurora">
      <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full border border-brand-300/25 animate-spin-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border border-dashed border-navy-300/25 animate-spin-slow pointer-events-none" style={{ animationDirection: "reverse", animationDuration: "30s" }} />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-6">No more excuses</p>
        <h2 className="font-display font-bold text-navy-950 text-[clamp(2.6rem,6.5vw,4.8rem)] leading-[1.02] mb-8">
          Five minutes from now,
          <br />
          <span className="trust-gradient">you could be compliant.</span>
        </h2>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-12">
          One script. Every tracker blocked until consent. Every decision logged.
          Your move, regulators.
        </p>

        <div className="inline-block" onMouseMove={onMove} onMouseLeave={onLeave}>
          <Link
            ref={btnRef}
            href="/signup"
            className="btn-brand btn-glow shine group inline-flex items-center gap-3 px-10 py-5 text-lg font-semibold rounded-2xl"
            style={{ transition: "transform 0.2s ease-out" }}
          >
            Start your free trial
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
          </Link>
        </div>

        <p className="text-sm text-slate-400 mt-8">14 days free · no credit card · cancel anytime</p>
      </div>
    </section>
  );
}
