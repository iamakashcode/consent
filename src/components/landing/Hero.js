"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Shield, Users, Lock, Award, Sparkles } from "lucide-react";

const TRUST_WORDS = ["Trust", "Choose", "Believe In", "Rely On"];
const COMPANIES = ["Shopify", "Vercel", "Webflow", "Framer", "Ghost", "Prismic", "Contentful", "Netlify"];

const PARTICLES = [
  { size: 6, top: "12%", left: "6%", delay: "0s", color: "rgba(183,83,239,0.5)" },
  { size: 4, top: "30%", left: "14%", delay: "1.8s", color: "rgba(18,11,125,0.35)" },
  { size: 8, top: "64%", left: "4%", delay: "3.2s", color: "rgba(183,83,239,0.35)" },
  { size: 5, top: "18%", left: "88%", delay: "0.9s", color: "rgba(122,61,219,0.45)" },
  { size: 7, top: "58%", left: "93%", delay: "2.4s", color: "rgba(183,83,239,0.4)" },
  { size: 4, top: "80%", left: "70%", delay: "4s", color: "rgba(18,11,125,0.3)" },
];

function useTypewriter(words, typeSpeed = 85, deleteSpeed = 48, pauseMs = 2200) {
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(words[0].length);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const word = words[wordIdx];
    if (paused) {
      const t = setTimeout(() => { setPaused(false); setDeleting(true); }, pauseMs);
      return () => clearTimeout(t);
    }
    if (deleting) {
      if (charIdx > 0) {
        const t = setTimeout(() => setCharIdx(c => c - 1), deleteSpeed);
        return () => clearTimeout(t);
      }
      setDeleting(false);
      setWordIdx(i => (i + 1) % words.length);
      return;
    }
    if (charIdx < word.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), typeSpeed);
      return () => clearTimeout(t);
    }
    setPaused(true);
  }, [charIdx, deleting, paused, wordIdx, words, typeSpeed, deleteSpeed, pauseMs]);

  return words[wordIdx].slice(0, charIdx);
}

function DashboardPreview() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(t);
  }, []);

  const bars = [38, 55, 44, 72, 68, 88, 94];

  return (
    <div className="relative stage-3d">
      <div className="absolute -inset-8 bg-gradient-to-r from-brand-500/15 via-navy-500/10 to-brand-500/15 rounded-3xl blur-3xl pointer-events-none" />

      <div className="tilt-3d relative">
        {/* Floating glass chips */}
        <div className="absolute -top-5 -right-3 z-20 glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 animate-float" style={{ transform: "translateZ(50px)" }}>
          <div className="w-7 h-7 rounded-full icon-tile flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-800 leading-tight">GDPR Verified</p>
            <p className="text-[10px] text-brand-600 font-medium">Compliant ✓</p>
          </div>
        </div>

        <div className="absolute -bottom-5 -left-3 z-20 glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 animate-float" style={{ animationDelay: "2.5s", transform: "translateZ(40px)" }}>
          <div className="w-7 h-7 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0 shadow-md shadow-navy-800/30">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-800 leading-tight">94.2% Consent Rate</p>
            <p className="text-[10px] text-navy-600 font-medium">↑ 3.2% this week</p>
          </div>
        </div>

        {/* Dashboard window */}
        <div className="relative rounded-2xl border border-white/70 shadow-2xl shadow-navy-800/15 bg-white/85 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-50/80 to-navy-50/60 border-b border-brand-100/60">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-white/80 border border-brand-100 rounded-md px-3 py-1.5 text-xs text-slate-400 max-w-xs flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-brand-500 flex-shrink-0" />
                app.cookieaccess.io/dashboard
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-600 font-medium">LIVE</span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Domains", value: "12", sub: "+2 this mo", color: "text-brand-600" },
                { label: "Page Views", value: "248K", sub: "+18% MoM", color: "text-navy-600" },
                { label: "Consent Rate", value: "94%", sub: "↑ Industry #1", color: "text-emerald-600" },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-xl border border-brand-100/70 p-3 glow-card">
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide mb-1.5 leading-none">{m.label}</p>
                  <p className="text-xl font-bold text-navy-900 leading-none mb-1">{m.value}</p>
                  <span className={`text-[9px] font-medium ${m.color}`}>{m.sub}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-brand-100/70 p-3.5 glow-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700">Consent Rate</p>
                <span className="text-[10px] text-brand-700 font-medium bg-brand-50 px-2 py-0.5 rounded-full">↑ Trending up</span>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{
                    height: `${h}%`,
                    background: i >= 5 ? "linear-gradient(to top, #120b7d, #b753ef)" : i >= 3 ? "linear-gradient(to top, #8d86ef, #d9a6f7)" : "#EAE6F2",
                    transformOrigin: "bottom",
                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                    transition: `transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07 + 0.3}s`,
                  }} />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i} className="text-[9px] text-slate-400 flex-1 text-center">{d}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-brand-100/70 p-3.5 glow-card">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold text-slate-700">Protected Domains</p>
                <span className="text-[10px] text-brand-600 font-medium">View all →</span>
              </div>
              <div className="space-y-2">
                {[{ domain: "myshop.com", rate: "96%", trend: "↑" }, { domain: "analytics.io", rate: "91%", trend: "→" }].map((d) => (
                  <div key={d.domain} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-slate-600">{d.domain}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{d.trend} {d.rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const typewriterText = useTypewriter(TRUST_WORDS);

  return (
    <section className="relative pt-8 pb-20 lg:pt-12 lg:pb-28 overflow-hidden bg-aurora">
      {/* Futuristic grid floor */}
      <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />

      {/* Animated brand orbs */}
      <div className="absolute top-[-80px] right-[-80px] w-[680px] h-[680px] rounded-full pointer-events-none animate-orb1" style={{ background: "radial-gradient(circle, rgba(183,83,239,0.13) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-100px] left-[-100px] w-[580px] h-[580px] rounded-full pointer-events-none animate-orb2" style={{ background: "radial-gradient(circle, rgba(18,11,125,0.1) 0%, transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none animate-orb3" style={{ background: "radial-gradient(circle, rgba(122,61,219,0.08) 0%, transparent 70%)" }} />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            width: p.size, height: p.size, top: p.top, left: p.left,
            background: p.color, animationDelay: p.delay,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <div>
            {/* Badge */}
            <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span className="text-xs text-navy-800 tracking-wide">
                Trusted by <span className="font-semibold">12,000+</span> companies worldwide
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse flex-shrink-0" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-[3.5rem] font-bold text-navy-950 leading-[1.08] tracking-tight mb-5">
              Build products
              <br />
              <span className="trust-gradient">your users&nbsp;</span>
              <span className="inline-block relative">
                <span className="trust-gradient">{typewriterText}</span>
                <span className="inline-block w-[3px] h-[0.85em] ml-0.5 bg-brand-500 align-middle cursor-blink" />
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-[460px]">
              Turn cookie compliance into a competitive edge. Auto-detect trackers, collect genuine
              consent, and show your users you take privacy seriously — in minutes, not months.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/signup" className="btn-brand btn-glow shine inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold rounded-xl group">
                Start building trust
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <a href="#live-demo" className="glass inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-navy-800 rounded-xl hover:bg-white/90 hover:text-brand-700 transition-all duration-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                Watch live demo
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400 mb-8">
              {["14-day free trial", "No credit card required", "Cancel anytime"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span>{t}</span>
                </div>
              ))}
            </div>

            {/* Compliance chips */}
            <div className="flex flex-wrap gap-2">
              {["GDPR", "CCPA", "ePrivacy", "LGPD"].map((reg) => (
                <span key={reg} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-navy-800 bg-white/70 backdrop-blur border border-brand-200/60 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-colors cursor-default">
                  <Shield className="w-3 h-3 text-brand-600" />
                  {reg} ready
                </span>
              ))}
            </div>
          </div>

          <div className="lg:pl-4">
            <DashboardPreview />
          </div>
        </div>

        {/* Marquee */}
        <div className="mt-16 pt-10 border-t border-brand-100/60 overflow-hidden">
          <p className="text-center text-[11px] text-slate-400 tracking-widest uppercase mb-7">
            Trusted by compliance teams at
          </p>
          <div className="relative overflow-hidden" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            <div className="animate-marquee">
              {[...COMPANIES, ...COMPANIES].map((name, i) => (
                <span key={i} className="px-8 text-slate-300 font-semibold text-base tracking-tight hover:text-brand-500 transition-colors cursor-default select-none">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
