import { Search, Palette, Code2, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Add your domain and let us scan",
    desc: "Paste your URL and our crawler visits your site, intercepts every outgoing request, and maps every tracker — Google Analytics, Meta Pixel, Hotjar, and 200+ more. You don't write a line of config.",
    highlight: "200+ trackers detected automatically",
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
    bullets: [
      "One script, zero dependencies",
      "Works with any CMS or framework",
      "Adds less than 1ms to page load",
    ],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-white via-brand-50/30 to-white">
      <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-brand-200/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
            <Code2 className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs text-navy-800 tracking-wide">How it works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy-950 mb-4 leading-snug">
            From first visit to{" "}
            <span className="trust-gradient">fully compliant in 5 minutes</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            No developer skills required. No lengthy onboarding calls. Three steps and your users
            start seeing a company that cares about their privacy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting gradient line */}
          <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-px bg-gradient-to-r from-brand-300/0 via-brand-400/50 to-brand-300/0 pointer-events-none" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="group relative bg-white/80 backdrop-blur rounded-2xl border border-brand-100 p-7 glow-card glow-card-hover hover:border-brand-300 transition-all duration-300 hover:-translate-y-1.5">
                <div className="flex items-start justify-between mb-6">
                  <div className="icon-tile w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-5xl font-bold select-none leading-none bg-gradient-to-b from-brand-200 to-brand-100/30 bg-clip-text text-transparent">{s.step}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mb-4 bg-brand-50 text-brand-700 border border-brand-200/70">
                  {s.highlight}
                </div>

                <h3 className="text-base font-semibold text-navy-950 mb-3 leading-snug">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">{s.desc}</p>

                <ul className="space-y-2">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/signup" className="btn-brand shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl">
            Get started — free for 14 days
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
