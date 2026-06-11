"use client";

import { useState } from "react";
import {
  CheckCircle2,
  X,
  Shield,
  Lock,
  BarChart3,
  Play,
  RotateCcw,
  AlertCircle,
  Eye,
} from "lucide-react";

const trackers = [
  { name: "Google Analytics", category: "Analytics", icon: BarChart3 },
  { name: "Meta Pixel", category: "Marketing", icon: AlertCircle },
  { name: "Hotjar", category: "Analytics", icon: Eye },
  { name: "LinkedIn Insight Tag", category: "Marketing", icon: AlertCircle },
];

export default function LiveDemo() {
  const [state, setState] = useState("idle"); // idle | banner | accepted | rejected
  const [logTs] = useState(() => new Date().toLocaleTimeString());

  const reset = () => setState("idle");

  return (
    <section id="live-demo" className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-white to-brand-50/40">
      <div className="absolute top-10 right-10 w-[400px] h-[300px] bg-brand-200/25 blur-[110px] rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
            <Play className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs text-navy-800 tracking-wide">
              Interactive demo
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy-950 mb-4 leading-snug">
            See it work{" "}
            <span className="trust-gradient">in real time</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-xl mx-auto">
            Click the button below to experience exactly what your users will see — and what happens
            under the hood after they decide.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 items-start">

            {/* ── Left: simulated website + banner overlay ── */}
            <div className="relative rounded-2xl border border-brand-100 overflow-hidden bg-white glow-card min-h-[380px]">
              {/* Simulated page content */}
              <div
                className={`p-6 transition-all duration-500 ${
                  state === "banner" ? "blur-[1.5px] opacity-40 pointer-events-none" : ""
                }`}
              >
                <div className="mb-5">
                  <div className="h-6 bg-brand-100 rounded-lg w-2/5 mb-3" />
                  <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
                  <div className="h-3 bg-slate-100 rounded w-5/6 mb-1.5" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="h-28 bg-slate-100 rounded-xl" />
                  <div className="h-28 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-full mb-1.5" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>

              {/* ── Idle: launch button ── */}
              {state === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                  <button
                    onClick={() => setState("banner")}
                    className="btn-brand shine group flex items-center gap-3 px-7 py-4 font-semibold rounded-2xl"
                  >
                    <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-white" />
                    </span>
                    Launch Live Demo
                  </button>
                  <p className="mt-3 text-xs text-slate-400 font-medium">
                    Simulates a real user landing on your site
                  </p>
                </div>
              )}

              {/* ── Banner state ── */}
              {state === "banner" && (
                <div className="absolute inset-x-0 bottom-0 glass border-t border-brand-100 shadow-2xl p-5 animate-slide-in-up">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg icon-tile-soft flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-950 mb-1">We value your privacy</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        We and our partners use cookies and tracking technologies to personalise
                        content, analyse site usage, and serve targeted ads. Choose your preference.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setState("accepted")}
                      className="btn-brand px-4 py-2 text-xs font-bold rounded-lg"
                    >
                      ✓ Accept All
                    </button>
                    <button
                      onClick={() => setState("rejected")}
                      className="px-4 py-2 text-xs font-bold text-navy-800 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      ✗ Reject All
                    </button>
                    <button className="px-4 py-2 text-xs font-semibold text-slate-500 border border-brand-200 hover:border-brand-300 rounded-lg transition-colors">
                      ⚙ Manage Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* ── Accepted state ── */}
              {state === "accepted" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6 animate-slide-in-up">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-base font-semibold text-navy-950 mb-1">Consent Accepted</p>
                  <p className="text-xs text-slate-400 mb-5 text-center">
                    User granted consent — scripts are now active
                  </p>
                  <div className="w-full space-y-2">
                    {trackers.map((t, i) => (
                      <div
                        key={t.name}
                        className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl animate-slide-in-up"
                        style={{ animationDelay: `${i * 0.08}s` }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{t.name}</p>
                          <p className="text-[10px] text-slate-400">{t.category}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Active ●
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={reset} className="mt-5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-700 transition-colors font-medium">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset demo
                  </button>
                </div>
              )}

              {/* ── Rejected state ── */}
              {state === "rejected" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6 animate-slide-in-up">
                  <div className="w-14 h-14 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
                    <Lock className="w-7 h-7 text-brand-700" />
                  </div>
                  <p className="text-base font-semibold text-navy-950 mb-1">Tracking Blocked</p>
                  <p className="text-xs text-slate-400 mb-5 text-center">
                    User declined — all non-essential scripts blocked
                  </p>
                  <div className="w-full space-y-2">
                    {trackers.map((t, i) => (
                      <div
                        key={t.name}
                        className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl animate-slide-in-up"
                        style={{ animationDelay: `${i * 0.08}s` }}
                      >
                        <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-500 truncate">{t.name}</p>
                          <p className="text-[10px] text-slate-400">{t.category}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Blocked ✕
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={reset} className="mt-5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-700 transition-colors font-medium">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset demo
                  </button>
                </div>
              )}
            </div>

            {/* ── Right: audit log output ── */}
            <div className="flex flex-col gap-4">
              {/* What's happening */}
              <div className="glass rounded-2xl p-5">
                <p className="text-xs font-semibold text-navy-900 mb-3">
                  What&apos;s happening
                </p>
                <div className="space-y-3">
                  {[
                    {
                      step: state === "idle" ? "pending" : "done",
                      text: "User lands on your site",
                    },
                    {
                      step: state === "idle" ? "pending" : state === "banner" ? "active" : "done",
                      text: "Consent banner shown — all scripts blocked",
                    },
                    {
                      step:
                        state === "accepted" || state === "rejected" ? "done" : "pending",
                      text:
                        state === "accepted"
                          ? "User accepted → scripts released"
                          : state === "rejected"
                          ? "User rejected → scripts remain blocked"
                          : "User makes a consent decision",
                    },
                    {
                      step: state === "accepted" || state === "rejected" ? "done" : "pending",
                      text: "Decision logged to immutable audit trail",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black transition-colors duration-300 ${
                          item.step === "done"
                            ? "bg-emerald-500 text-white"
                            : item.step === "active"
                            ? "bg-brand-gradient text-white animate-pulse"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        {item.step === "done" ? "✓" : i + 1}
                      </div>
                      <p
                        className={`text-xs mt-0.5 leading-relaxed ${
                          item.step === "done"
                            ? "text-slate-800 font-semibold"
                            : item.step === "active"
                            ? "text-brand-700 font-bold"
                            : "text-slate-400"
                        }`}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit log */}
              {(state === "accepted" || state === "rejected") && (
                <div className="bg-navy-950 rounded-2xl p-5 font-mono text-xs animate-slide-in-up border border-brand-500/20 shadow-xl shadow-navy-900/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-navy-100/50 text-[10px] tracking-wider font-medium">
                      Consent Audit Log
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <p>
                      <span className="text-brand-400">event</span>
                      <span className="text-navy-100/40">: </span>
                      <span className="text-emerald-300">
                        &quot;{state === "accepted" ? "consent_accepted" : "consent_rejected"}&quot;
                      </span>
                    </p>
                    <p>
                      <span className="text-brand-400">timestamp</span>
                      <span className="text-navy-100/40">: </span>
                      <span className="text-white">&quot;{logTs}&quot;</span>
                    </p>
                    <p>
                      <span className="text-brand-400">ip_hash</span>
                      <span className="text-navy-100/40">: </span>
                      <span className="text-white">&quot;sha256:a3f2...&quot;</span>
                    </p>
                    <p>
                      <span className="text-brand-400">categories</span>
                      <span className="text-navy-100/40">: </span>
                      <span className="text-amber-300">
                        {state === "accepted"
                          ? '["analytics", "marketing"]'
                          : "[]"}
                      </span>
                    </p>
                    <p>
                      <span className="text-brand-400">scripts_blocked</span>
                      <span className="text-navy-100/40">: </span>
                      <span className={state === "accepted" ? "text-emerald-300" : "text-red-400"}>
                        {state === "accepted" ? "false" : "true"}
                      </span>
                    </p>
                    <p>
                      <span className="text-brand-400">gdpr_valid</span>
                      <span className="text-navy-100/40">: </span>
                      <span className="text-emerald-300">true</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-brand-500/15 text-[10px] text-navy-100/40">
                    ✓ Immutable record — stored for 3 years per GDPR Art. 7
                  </div>
                </div>
              )}

              {state === "idle" && (
                <div className="bg-brand-50/80 border border-brand-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-brand-800 mb-2">How this works</p>
                  <p className="text-xs text-brand-700/80 leading-relaxed">
                    Every visitor decision — accept or reject — is captured in a cryptographically
                    signed audit log. This is your legal evidence of valid consent under GDPR
                    Article 7 and CCPA.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
