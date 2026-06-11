"use client";

import { useEffect, useRef, useState } from "react";
import { Star, Quote } from "lucide-react";

const STATS = [
  { target: 12000, suffix: "+", label: "Companies protected" },
  { target: 2.4, suffix: "B+", decimals: 1, label: "Consent events handled" },
  { target: 94.2, suffix: "%", decimals: 1, label: "Average consent rate" },
  { target: 99.9, suffix: "%", decimals: 1, label: "Uptime SLA" },
];

const STORIES = [
  {
    name: "Alex Rivera",
    role: "Founder, SaaSFlow",
    avatar: "AR",
    gradient: "from-brand-500 to-brand-700",
    industry: "SaaS",
    before: "Exposed to GDPR risk for 18 months",
    after: "Deployed and compliant in under 10 minutes",
    metric: "94% consent rate, first week",
    quote:
      "Switched to Cookie Access and had it live in under 10 minutes. The auto-detection caught trackers we didn't even know were running. Our legal team finally stopped sending us nervous emails.",
  },
  {
    name: "Sarah Chen",
    role: "CTO, NextGen Media",
    avatar: "SC",
    gradient: "from-navy-600 to-navy-800",
    industry: "Media",
    before: "40+ tracking scripts across 12 sites, zero coverage",
    after: "Full compliance across every property",
    metric: "Zero compliance incidents in 14 months",
    quote:
      "We run a lot of third-party scripts across twelve sites. Cookie Access detected and categorised every single one without any manual work. The audit logs are exactly what our data protection officer needed.",
  },
  {
    name: "Marcus Thorne",
    role: "Lead Developer, Acme Corp",
    avatar: "MT",
    gradient: "from-brand-600 to-navy-700",
    industry: "E-commerce",
    before: "Three other tools degraded our Core Web Vitals",
    after: "Lighthouse scores unchanged after deployment",
    metric: "<1ms page-load impact measured",
    quote:
      "We tested four consent managers. Every other one affected our performance scores. Cookie Access is genuinely undetectable in our metrics. That matters when you're optimising for every millisecond.",
  },
];

function Counter({ target, suffix, decimals = 0 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const fired = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          const duration = 1800;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(+(target * eased).toFixed(decimals));
            if (progress < 1) requestAnimationFrame(step);
            else setValue(target);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, decimals]);

  return (
    <span ref={ref}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export default function Proof() {
  return (
    <section id="proof" className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-b from-white to-brand-50/40">
      <div className="absolute bottom-0 left-1/4 w-[420px] h-[320px] bg-brand-200/30 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">The proof</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-navy-950 leading-[1.04]">
            Numbers first.<br />
            <span className="trust-gradient">Stories second.</span>
          </h2>
        </div>

        {/* Animated counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-3xl overflow-hidden border border-brand-200/50 bg-brand-200/40 mb-14">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/80 backdrop-blur px-6 py-7 text-center">
              <p className="font-display text-4xl font-bold trust-gradient mb-1.5 tabular-nums">
                <Counter target={s.target} suffix={s.suffix} decimals={s.decimals || 0} />
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Customer stories with before/after outcomes */}
        <div className="grid md:grid-cols-3 gap-6">
          {STORIES.map((t) => (
            <article key={t.name} className="glass rounded-3xl p-7 glow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Quote className="w-6 h-6 text-brand-300" />
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>

              <blockquote className="text-slate-600 leading-relaxed text-sm mb-6 flex-1">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="bg-white/70 rounded-2xl border border-brand-100/70 p-4 mb-5 space-y-2">
                <p className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 font-semibold flex-shrink-0">Before:</span>
                  <span className="text-slate-500">{t.before}</span>
                </p>
                <p className="flex items-start gap-2 text-xs">
                  <span className="text-emerald-600 font-semibold flex-shrink-0">After:</span>
                  <span className="text-slate-700">{t.after}</span>
                </p>
                <p className="pt-2 border-t border-brand-100/70 text-xs font-semibold trust-gradient">{t.metric}</p>
              </div>

              <footer className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md shadow-brand-500/20`}>
                  {t.avatar}
                </span>
                <span>
                  <span className="block font-display text-sm font-bold text-navy-950 leading-none mb-0.5">{t.name}</span>
                  <span className="block text-xs text-slate-400">{t.role}</span>
                </span>
                <span className="ml-auto text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-1 rounded-full">
                  {t.industry}
                </span>
              </footer>
            </article>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          These aren&apos;t cherry-picked — they&apos;re the three most common things new customers tell us in week one.
        </p>
      </div>
    </section>
  );
}
