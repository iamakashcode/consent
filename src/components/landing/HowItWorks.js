import { Search, Palette, Code2, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Add your domain and let us scan",
    desc: "Paste your URL and our crawler visits your site, intercepts every outgoing request, and maps every tracker — Google Analytics, Meta Pixel, Hotjar, and 200+ more. You don't write a line of config.",
    highlight: "200+ trackers detected automatically",
    color: "blue",
    bullets: [
      "Identifies all third-party scripts and cookies",
      "Categorises each by regulation type",
      "Re-scans automatically when your site changes",
    ],
  },
  {
    step: "02",
    icon: Palette,
    title: "Design a banner that feels like yours",
    desc: "Choose colours, copy, position, and language. The banner lives on your site — it should look like it belongs there, not like an afterthought dropped in by a compliance vendor.",
    highlight: "Fully brand-matched in minutes",
    color: "teal",
    bullets: [
      "Full colour, font and layout control",
      "Available in 30+ languages",
      "Bottom bar, modal, corner — your call",
    ],
  },
  {
    step: "03",
    icon: Code2,
    title: "Paste one line. You're live.",
    desc: "A single script tag in your site's head. From that moment, blocking, consent collection, audit logging, and analytics run automatically. Nothing else required.",
    highlight: "Live and compliant in under 5 minutes",
    color: "blue",
    bullets: [
      "One script, zero dependencies",
      "Works with any CMS or framework",
      "Adds less than 1ms to page load",
    ],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-slate-50/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <Code2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-700 tracking-wide">How it works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-snug">
            From first visit to{" "}
            <span className="trust-gradient">fully compliant in 5 minutes</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            No developer skills required. No lengthy onboarding calls. Three steps and your users
            start seeing a company that cares about their privacy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">

          {steps.map((s, i) => {
            const Icon = s.icon;
            const isBlue = s.color === "blue";
            return (
              <div key={i} className="group bg-white rounded-2xl border border-slate-200 p-7 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isBlue ? "bg-blue-700 text-white" : "bg-teal-600 text-white"}`}>
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-5xl font-bold text-slate-100 select-none leading-none">{s.step}</span>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs mb-4 ${isBlue ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-teal-50 text-teal-700 border-teal-100"}`}>
                  {s.highlight}
                </div>

                <h3 className="text-base font-semibold text-slate-900 mb-3 leading-snug">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">{s.desc}</p>

                <ul className="space-y-2">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isBlue ? "text-blue-400" : "text-teal-400"}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white rounded-xl bg-blue-700 hover:bg-blue-800 shadow-lg shadow-blue-700/25 transition-all duration-200 hover:-translate-y-0.5">
            Get started — free for 14 days
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
