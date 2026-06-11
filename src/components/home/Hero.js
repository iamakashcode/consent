"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, Shield, Ban, CheckCircle2 } from "lucide-react";

const ORBIT_OUTER = [
  { label: "Meta Pixel", angle: 0 },
  { label: "Google Analytics", angle: 120 },
  { label: "Hotjar", angle: 240 },
];
const ORBIT_INNER = [
  { label: "TikTok Pixel", angle: 45 },
  { label: "LinkedIn Tag", angle: 225 },
];

const TICKER = [
  ["2.4B+", "consents processed"],
  ["94.2%", "avg. consent rate"],
  ["<1ms", "page-load impact"],
  ["130+", "countries covered"],
];

function OrbitalScene() {
  return (
    <div className="relative w-[420px] h-[420px] max-w-full mx-auto select-none" aria-hidden="true">
      {/* Halo */}
      <div className="absolute inset-[-60px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(183,83,239,0.18) 0%, rgba(18,11,125,0.08) 45%, transparent 70%)" }} />

      {/* Outer dashed ring + orbiting blocked trackers */}
      <div className="orbit-ring absolute inset-0 rounded-full border border-dashed border-brand-400/40" style={{ animationDuration: "36s" }}>
        {ORBIT_OUTER.map((t) => (
          <div
            key={t.label}
            className="absolute top-1/2 left-1/2"
            style={{ transform: `rotate(${t.angle}deg) translateX(210px) rotate(-${t.angle}deg)` }}
          >
            <div className="orbit-item -translate-x-1/2 -translate-y-1/2 glass rounded-xl px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap" style={{ animationDuration: "36s" }}>
              <Ban className="w-3 h-3 text-red-400" />
              <span className="text-[11px] font-medium text-navy-900/80 line-through decoration-red-400/70">{t.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inner solid ring */}
      <div className="orbit-ring absolute inset-[70px] rounded-full border border-brand-300/50" style={{ animationDuration: "24s", animationDirection: "reverse" }}>
        {ORBIT_INNER.map((t) => (
          <div
            key={t.label}
            className="absolute top-1/2 left-1/2"
            style={{ transform: `rotate(${t.angle}deg) translateX(140px) rotate(-${t.angle}deg)` }}
          >
            <div className="orbit-item -translate-x-1/2 -translate-y-1/2 glass rounded-xl px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap" style={{ animationDuration: "24s", animationDirection: "reverse" }}>
              <Ban className="w-3 h-3 text-red-400" />
              <span className="text-[11px] font-medium text-navy-900/80 line-through decoration-red-400/70">{t.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Core orb */}
      <div className="core-pulse absolute inset-[132px] rounded-full overflow-hidden bg-brand-gradient flex items-center justify-center">
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 45%)" }} />
        <div className="scan-line absolute inset-x-3 h-10 rounded-full bg-white/30 blur-md" />
        <Shield className="relative w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.4} />
      </div>

      {/* Consent granted chip — static, below core */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 glass rounded-xl px-3.5 py-2 flex items-center gap-2 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[11px] font-semibold text-navy-900">Consent verified · logged</span>
      </div>
    </div>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const words = ["Cookie", "consent,"];

  return (
    <section ref={ref} className="noise relative min-h-screen flex flex-col overflow-hidden bg-aurora">
      <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />
      <div className="parallax-layer absolute top-[-120px] right-[-120px] w-[700px] h-[700px] rounded-full pointer-events-none" style={{ "--depth": -18, background: "radial-gradient(circle, rgba(183,83,239,0.14) 0%, transparent 70%)" }} />
      <div className="parallax-layer absolute bottom-[-140px] left-[-140px] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ "--depth": -12, background: "radial-gradient(circle, rgba(18,11,125,0.12) 0%, transparent 70%)" }} />

      <div className="relative flex-1 flex items-center max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-10 w-full">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center w-full">
          {/* Copy */}
          <div>
            <div className="glass inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-brand-500 opacity-60" />
                <span className="relative rounded-full h-2 w-2 bg-brand-500" />
              </span>
              <span className="text-xs font-medium text-navy-800 tracking-wide">12,000+ companies build trust with Cookie Access</span>
            </div>

            <h1 className="font-display font-bold text-navy-950 text-[clamp(3rem,7.5vw,5.5rem)] leading-[0.98] mb-7">
              <span className="block overflow-hidden pb-1">
                {words.map((w, i) => (
                  <span key={w} className="word-rise mr-[0.22em]" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
                    {w}
                  </span>
                ))}
              </span>
              <span className="block overflow-hidden pb-3">
                <span className="word-rise" style={{ animationDelay: "0.36s" }}>
                  <span className="headline-stroke trust-gradient">
                    reimagined.
                    <svg viewBox="0 0 300 24" fill="none" preserveAspectRatio="none">
                      <path d="M4 18 C 60 6, 150 4, 296 12" stroke="#b753ef" strokeWidth="7" strokeLinecap="round" pathLength="1" />
                    </svg>
                  </span>
                </span>
              </span>
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed mb-9 max-w-md">
              One script blocks every tracker until your visitors say yes — then proves it
              with an audit trail regulators actually accept.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link href="/signup" className="btn-brand btn-glow shine group inline-flex items-center gap-2.5 px-7 py-4 text-[15px] font-semibold rounded-2xl">
                Start free — 14 days
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#journey" className="group inline-flex items-center gap-2 px-2 py-4 text-[15px] font-semibold text-navy-900 transition-colors hover:text-brand-700">
                See how it works
                <span className="w-8 h-8 rounded-full glass flex items-center justify-center transition-transform group-hover:translate-y-1">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                </span>
              </a>
            </div>

            {/* Ticker stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-brand-200/50 bg-brand-200/40 max-w-xl">
              {TICKER.map(([v, l]) => (
                <div key={l} className="bg-white/75 backdrop-blur px-4 py-3">
                  <p className="font-display text-xl font-bold trust-gradient leading-none mb-1">{v}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-tight">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Orbital scene */}
          <div className="hidden lg:block parallax-layer" style={{ "--depth": 14 }}>
            {mounted && <OrbitalScene />}
          </div>
        </div>
      </div>

      {/* Bottom marquee */}
      <div className="relative border-t border-brand-100/60 bg-white/50 backdrop-blur py-4 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="animate-marquee" aria-hidden="true">
          {[..."AB"].flatMap((k) =>
            ["Shopify", "Vercel", "Webflow", "Framer", "Ghost", "Prismic", "Contentful", "Netlify"].map((n) => (
              <span key={k + n} className="px-9 text-slate-300 font-display font-semibold text-lg tracking-tight hover:text-brand-400 transition-colors cursor-default">
                {n}
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
