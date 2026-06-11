"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Palette, Code2, Activity, CheckCircle2 } from "lucide-react";

const VB_W = 1000;
const VB_H = 2000;
const PATH_D =
  "M500,0 C850,150 850,350 500,500 C150,650 150,850 500,1000 C850,1150 850,1350 500,1500 C150,1650 150,1850 500,2000";

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Drop in your domain",
    desc: "Our crawler sweeps your site, intercepts every outgoing request, and maps all 200+ known trackers — Google Analytics, Meta Pixel, Hotjar, everything. Zero config.",
    chip: "Scan finishes in ~40 seconds",
    side: "left",
  },
  {
    n: "02",
    icon: Palette,
    title: "Make the banner yours",
    desc: "Colours, copy, position, language — 30+ locales. The banner should look like your product designed it, not like a compliance vendor bolted it on.",
    chip: "Brand-matched in minutes",
    side: "right",
  },
  {
    n: "03",
    icon: Code2,
    title: "Paste one line of code",
    desc: "A single script tag. From that moment every tracker is blocked until consent, every decision is logged, and your analytics keep flowing — legally.",
    chip: "Live in under 5 minutes",
    side: "left",
  },
  {
    n: "04",
    icon: Activity,
    title: "Watch trust compound",
    desc: "Real-time consent rates, geographic breakdowns, and an immutable audit trail your legal team can hand straight to a regulator.",
    chip: "94.2% average consent rate",
    side: "right",
  },
];

export default function Journey() {
  const wrapRef = useRef(null);
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const path = pathRef.current;
    const wrap = wrapRef.current;
    const dot = dotRef.current;
    if (!path || !wrap || !dot) return;

    const totalLen = path.getTotalLength();
    let raf = null;

    const update = () => {
      raf = null;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const denom = rect.height - vh * 0.35;
      const p = Math.min(1, Math.max(0, (vh * 0.65 - rect.top) / denom));

      path.style.strokeDashoffset = String(1 - p);

      const pt = path.getPointAtLength(totalLen * p);
      const x = (pt.x / VB_W) * rect.width;
      const y = (pt.y / VB_H) * rect.height;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      dot.style.opacity = p > 0.005 && p < 0.998 ? "1" : "0";

      const step = p <= 0 ? -1 : Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      setActive(step);
    };

    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="journey" className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-brand-100/50 blur-[120px] rounded-full pointer-events-none" />

      {/* Heading */}
      <div className="relative max-w-3xl mx-auto text-center px-6 mb-20">
        <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">The journey</p>
        <h2 className="font-display text-4xl md:text-6xl font-bold text-navy-950 leading-[1.04] mb-5">
          Follow the cookie<br />
          <span className="trust-gradient">from chaos to compliance.</span>
        </h2>
        <p className="text-slate-500 text-lg">
          Scroll. The path below is your entire setup — four stops, no developers required.
        </p>
      </div>

      {/* Path + steps */}
      <div ref={wrapRef} className="relative max-w-6xl mx-auto px-6 lg:px-8">
        {/* SVG path layer */}
        <svg
          className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="journeyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b753ef" />
              <stop offset="50%" stopColor="#7a3ddb" />
              <stop offset="100%" stopColor="#120b7d" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path d={PATH_D} stroke="#ece4f7" strokeWidth="3" />
          {/* Drawn progress */}
          <path
            ref={pathRef}
            d={PATH_D}
            stroke="url(#journeyGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="1"
          />
          {/* Milestone nodes at the crossings */}
          {[250, 750, 1250, 1750].map((y, i) => {
            const x = i % 2 === 0 ? 762 : 238;
            return (
              <circle
                key={y}
                cx={x}
                cy={y}
                r="9"
                fill={active >= i ? "#b753ef" : "#ffffff"}
                stroke={active >= i ? "#b753ef" : "#d8c8ee"}
                strokeWidth="4"
                style={{ transition: "fill 0.4s ease, stroke 0.4s ease" }}
              />
            );
          })}
        </svg>

        {/* Travelling cookie */}
        <div
          ref={dotRef}
          className="journey-dot hidden md:flex absolute top-0 left-0 z-10 w-12 h-12 rounded-full glass items-center justify-center text-xl pointer-events-none"
          style={{ opacity: 0, transition: "opacity 0.3s ease" }}
          aria-hidden="true"
        >
          🍪
        </div>

        {/* Step cards */}
        <div className="relative space-y-10 md:space-y-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const state = active >= i ? "active" : "inactive";
            return (
              <div
                key={s.n}
                className={`md:min-h-[500px] flex items-center ${
                  s.side === "left" ? "md:justify-start" : "md:justify-end"
                }`}
              >
                <div
                  className={`journey-card ${state} w-full md:w-[44%] bg-white rounded-3xl border border-brand-100 p-8`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="icon-tile w-12 h-12 rounded-2xl flex items-center justify-center">
                      <Icon className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <span className="font-display text-6xl font-bold text-outline select-none leading-none">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-navy-950 mb-3">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-5">{s.desc}</p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {s.chip}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
