"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Zap, Globe2, Languages, FileText, Ban, CheckCircle2, RotateCcw } from "lucide-react";

/* ── Mini interactive consent demo ── */
function DemoTile() {
  const [state, setState] = useState("banner"); // banner | accepted | rejected
  const trackers = ["Google Analytics", "Meta Pixel", "Hotjar", "LinkedIn Tag"];

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-navy-950">Try the banner. Right here.</h3>
          <p className="text-sm text-slate-400">This is the real thing — click a button.</p>
        </div>
        {state !== "banner" && (
          <button onClick={() => setState("banner")} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Fake browser */}
      <div className="flex-1 rounded-2xl border border-brand-100 bg-white overflow-hidden flex flex-col min-h-[260px]">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-50/60 border-b border-brand-100/70">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] text-slate-400 bg-white border border-brand-100 rounded-md px-2.5 py-0.5">yoursite.com</span>
        </div>

        <div className="relative flex-1 p-5">
          <div className={`transition-all duration-300 ${state === "banner" ? "opacity-30 blur-[1px]" : ""}`}>
            <div className="h-4 w-2/5 bg-brand-100 rounded mb-2.5" />
            <div className="h-2.5 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-2.5 w-4/5 bg-slate-100 rounded mb-4" />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="h-16 bg-slate-100 rounded-lg" />
              <div className="h-16 bg-slate-100 rounded-lg" />
            </div>
          </div>

          {state === "banner" && (
            <div className="absolute inset-x-4 bottom-4 glass rounded-2xl p-4 animate-slide-in-up">
              <p className="text-[13px] font-semibold text-navy-950 mb-1">🍪 We respect your choice</p>
              <p className="text-[11px] text-slate-500 leading-snug mb-3">
                Trackers stay blocked until you decide. Either answer is logged as legal proof.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setState("accepted")} className="btn-brand px-4 py-1.5 text-[11px] font-bold rounded-lg">Accept all</button>
                <button onClick={() => setState("rejected")} className="px-4 py-1.5 text-[11px] font-bold text-navy-800 bg-white border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors">Reject all</button>
              </div>
            </div>
          )}

          {state !== "banner" && (
            <div className="absolute inset-x-4 bottom-4 space-y-1.5">
              {trackers.map((t, i) => (
                <div key={t} className={`flex items-center justify-between rounded-lg px-3 py-1.5 border animate-slide-in-up ${state === "accepted" ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-200"}`} style={{ animationDelay: `${i * 0.07}s` }}>
                  <span className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                    {state === "accepted" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Ban className="w-3.5 h-3.5 text-slate-400" />}
                    {t}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${state === "accepted" ? "text-emerald-600 bg-emerald-100" : "text-slate-500 bg-slate-200/60"}`}>
                    {state === "accepted" ? "active" : "blocked"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Auto-typing audit terminal ── */
const TERM_LINES = [
  ["event", '"consent_accepted"'],
  ["timestamp", '"2026-06-12T09:41:07Z"'],
  ["ip_hash", '"sha256:a3f2…9c"'],
  ["categories", '["analytics","marketing"]'],
  ["gdpr_valid", "true"],
];

function TerminalTile() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => (c >= TERM_LINES.length ? 0 : c + 1));
    }, 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-brand-300" />
        <h3 className="font-display text-base font-bold text-white">Court-ready audit log</h3>
      </div>
      <p className="text-xs text-navy-100/50 mb-4">Every decision, cryptographically signed. GDPR Art. 7 evidence on tap.</p>
      <div className="flex-1 rounded-xl bg-navy-950/80 border border-brand-500/20 p-4 font-mono text-[11px] leading-relaxed overflow-hidden">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-navy-100/40 text-[9px] tracking-widest uppercase">live · consent stream</span>
        </div>
        {TERM_LINES.slice(0, count).map(([k, v]) => (
          <p key={k} className="animate-slide-in-up">
            <span className="text-brand-400">{k}</span>
            <span className="text-navy-100/40">: </span>
            <span className={v === "true" ? "text-emerald-300" : "text-white/85"}>{v}</span>
          </p>
        ))}
        <span className="term-caret" />
      </div>
    </div>
  );
}

/* ── Animated consent ring ── */
function RingTile() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div ref={ref} className="h-full flex flex-col items-center justify-center text-center">
      <div className="relative w-36 h-36 mb-4">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="#f0e7fb" strokeWidth="11" />
          <circle
            cx="64" cy="64" r={R} fill="none"
            stroke="url(#ringGrad)" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={on ? C * (1 - 0.942) : C}
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)" }}
          />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#b753ef" />
              <stop offset="100%" stopColor="#120b7d" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold trust-gradient">94.2%</span>
        </div>
      </div>
      <h3 className="font-display text-base font-bold text-navy-950 mb-1">Average consent rate</h3>
      <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">Industry average is 60%. Respectful banners convert better.</p>
    </div>
  );
}

/* ── Speed tile ── */
function SpeedTile() {
  return (
    <div className="h-full flex flex-col justify-between">
      <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center mb-4">
        <Zap className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-display text-4xl font-bold trust-gradient leading-none mb-2">&lt;1ms</p>
        <h3 className="font-display text-base font-bold text-navy-950 mb-1">Zero performance tax</h3>
        <p className="text-xs text-slate-400 leading-relaxed">CDN-delivered, async, invisible to Lighthouse. Your Core Web Vitals never notice us.</p>
      </div>
    </div>
  );
}

/* ── Geo tile ── */
function GeoTile() {
  const dots = [
    [12, 30], [22, 22], [30, 42], [44, 18], [52, 34], [62, 26], [74, 38], [84, 20], [68, 50], [38, 55], [18, 58], [88, 52],
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center mb-4">
        <Globe2 className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-base font-bold text-navy-950 mb-1">Geo-targeted rules</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">GDPR banner in Berlin, CCPA notice in California — automatic, by IP.</p>
      <div className="relative flex-1 min-h-[90px] rounded-xl bg-gradient-to-br from-brand-50 to-navy-50/60 border border-brand-100/70 overflow-hidden">
        {dots.map(([x, y], i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-brand-500 ticker-pulse"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.4}s` }}
          />
        ))}
        <span className="absolute left-[44%] top-[18%] w-4 h-4 rounded-full bg-brand-500/20 animate-ping" />
        <span className="absolute left-[68%] top-[50%] w-4 h-4 rounded-full bg-navy-500/20 animate-ping" style={{ animationDelay: "0.8s" }} />
      </div>
    </div>
  );
}

/* ── Languages tile ── */
function LangTile() {
  return (
    <div className="h-full flex flex-col">
      <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center mb-4">
        <Languages className="w-5 h-5" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-base font-bold text-navy-950 mb-1">30+ languages</h3>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">Auto-localised to each visitor.</p>
      <div className="flex flex-wrap gap-1.5">
        {["EN", "DE", "FR", "ES", "PT", "JA", "NL", "IT", "PL", "SV", "+21"].map((l) => (
          <span key={l} className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200/60 rounded-md px-2 py-1">{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function Bento() {
  return (
    <section id="platform" className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-b from-white via-brand-50/40 to-white">
      <div className="absolute top-40 right-[-100px] w-[500px] h-[500px] bg-brand-200/30 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">The platform</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-navy-950 leading-[1.04]">
            Everything live.<br />
            <span className="trust-gradient">Nothing static.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-6 gap-5 auto-rows-fr">
          {/* Demo — big tile */}
          <div className="md:col-span-4 md:row-span-2 glass rounded-3xl p-7 glow-card-hover">
            <DemoTile />
          </div>

          {/* Terminal — dark tile */}
          <div className="md:col-span-2 md:row-span-2 rounded-3xl p-7 bg-gradient-to-b from-navy-900 to-navy-950 border border-brand-500/20 shadow-xl shadow-navy-900/20">
            <TerminalTile />
          </div>

          {/* Ring */}
          <div className="md:col-span-2 glass rounded-3xl p-7 glow-card-hover">
            <RingTile />
          </div>

          {/* Speed */}
          <div className="md:col-span-2 glass rounded-3xl p-7 glow-card-hover">
            <SpeedTile />
          </div>

          {/* Geo */}
          <div className="md:col-span-2 glass rounded-3xl p-7 glow-card-hover">
            <GeoTile />
          </div>

          {/* Languages — wide */}
          <div className="md:col-span-3 glass rounded-3xl p-7 glow-card-hover">
            <LangTile />
          </div>

          {/* Security strip */}
          <div className="md:col-span-3 rounded-3xl p-7 bg-brand-gradient text-white shadow-xl shadow-brand-500/25 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 blur-3xl rounded-full pointer-events-none" />
            <Shield className="w-9 h-9 mb-4" strokeWidth={1.4} />
            <div>
              <h3 className="font-display text-base font-bold mb-1">SOC 2 · AES-256 · EU residency</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Bank-grade encryption, annual third-party audits, and data that never leaves the EU without your say-so.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
