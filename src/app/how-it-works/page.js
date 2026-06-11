import PageShell from "@/components/home/PageShell";
import FinalCTA from "@/components/home/FinalCTA";
import Link from "next/link";
import {
  Search, Palette, Code2, CheckCircle2, ArrowRight, Globe2,
  Zap, ShieldAlert, FileText, MousePointerClick, Server, Timer,
} from "lucide-react";

export const metadata = {
  title: "How It Works",
  description:
    "See how Cookie Access gets your website GDPR and CCPA compliant in under five minutes: automated tracker scanning, a brand-matched banner editor, and one-line installation.",
};

/* ── Visual: add domain ── */
function DomainVisual() {
  return (
    <div className="glass rounded-3xl p-6">
      <p className="text-xs font-semibold text-navy-900 mb-4">Add your first domain</p>
      <div className="flex gap-2 mb-5">
        <div className="flex-1 bg-white border border-brand-200/70 rounded-xl px-4 py-3 text-sm text-navy-950 font-medium">
          yoursite.com
        </div>
        <span className="btn-brand inline-flex items-center px-5 py-3 text-sm font-semibold rounded-xl">Scan</span>
      </div>
      <div className="space-y-2.5">
        {[
          ["Crawling 47 pages…", 100],
          ["Intercepting network requests…", 100],
          ["Matching against 200+ tracker signatures…", 100],
          ["Categorising by regulation type…", 72],
        ].map(([label, pct]) => (
          <div key={label}>
            <p className="text-[11px] text-slate-500 mb-1">{label}</p>
            <div className="h-1.5 rounded-full bg-brand-100/70 overflow-hidden">
              <div className="h-full rounded-full bg-brand-gradient-r" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-brand-700 font-semibold mt-4 flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5" /> Average scan: 40 seconds
      </p>
    </div>
  );
}

/* ── Visual: banner editor ── */
function EditorVisual() {
  return (
    <div className="glass rounded-3xl p-6">
      <p className="text-xs font-semibold text-navy-900 mb-4">Banner editor · live preview</p>
      <div className="grid grid-cols-[1fr_1.6fr] gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Brand colour</p>
            <div className="flex gap-1.5">
              {["#b753ef", "#120b7d", "#0ea472", "#e1a210"].map((c, i) => (
                <span key={c} className={`w-6 h-6 rounded-lg ${i === 0 ? "ring-2 ring-offset-1 ring-brand-500" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Position</p>
            <div className="flex gap-1.5">
              {["Bar", "Modal", "Corner"].map((p, i) => (
                <span key={p} className={`text-[10px] font-bold px-2 py-1 rounded-md ${i === 0 ? "bg-brand-gradient text-white" : "bg-white border border-brand-200/60 text-slate-500"}`}>{p}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Language</p>
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-brand-200/60 text-slate-500">Auto (30+)</span>
          </div>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white p-3 flex flex-col justify-end">
          <div className="h-3 w-2/3 bg-slate-100 rounded mb-1.5" />
          <div className="h-3 w-1/2 bg-slate-100 rounded mb-3" />
          <div className="rounded-lg p-2.5" style={{ background: "linear-gradient(135deg,#b753ef,#7a3ddb)" }}>
            <p className="text-[10px] text-white font-medium mb-1.5">🍪 We respect your privacy</p>
            <div className="flex gap-1">
              <span className="text-[9px] font-bold bg-white text-brand-700 rounded px-2 py-0.5">Accept all</span>
              <span className="text-[9px] font-bold bg-white/20 text-white rounded px-2 py-0.5">Reject all</span>
              <span className="text-[9px] font-bold text-white/70 px-1 py-0.5">Manage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Visual: install snippet ── */
function InstallVisual() {
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-b from-navy-900 to-navy-950 border border-brand-500/20">
      <div className="flex items-center justify-between mb-4">
        <span className="text-navy-100/40 text-[10px] tracking-widest uppercase font-mono">index.html</span>
        <span className="text-[10px] font-bold text-brand-300 bg-brand-500/15 border border-brand-500/25 px-2 py-0.5 rounded-full">the only line you add</span>
      </div>
      <pre className="font-mono text-[12px] leading-relaxed overflow-x-auto">
        <code>
          <span className="text-navy-100/40">{"<head>"}</span>{"\n"}
          <span className="text-navy-100/30">{"  …"}</span>{"\n"}
          <span className="text-emerald-300">{'  <script src="https://cdn.cookieaccess.io/ca.js"'}</span>{"\n"}
          <span className="text-emerald-300">{'          data-site="ca_7f3a92" async></script>'}</span>{"\n"}
          <span className="text-navy-100/40">{"</head>"}</span>
        </code>
      </pre>
      <div className="mt-4 pt-3 border-t border-brand-500/15 grid grid-cols-3 gap-2 text-center">
        {[["14.6 kb", "script size"], ["<1ms", "exec time"], ["0", "dependencies"]].map(([v, l]) => (
          <div key={l}>
            <p className="font-display text-base font-bold text-white">{v}</p>
            <p className="text-[9px] text-navy-100/40 uppercase tracking-wider">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TIMELINE = [
  { t: "0:00", title: "Create your account", desc: "Email and password. No credit card, no sales call, no onboarding meeting." },
  { t: "0:30", title: "Add your domain", desc: "Paste your URL. Our crawler starts sweeping your site immediately." },
  { t: "1:10", title: "Review the scan", desc: "Every tracker found, categorised by regulation type. Approve with one click." },
  { t: "2:30", title: "Style your banner", desc: "Match your brand colours and pick a placement in the live editor." },
  { t: "4:00", title: "Paste the script tag", desc: "One line in your site's <head>. Works with any CMS or framework." },
  { t: "4:40", title: "You're compliant", desc: "Blocking active, consent logging live, analytics flowing. That's the whole setup." },
];

const STEPS = [
  {
    n: "01",
    icon: Search,
    kicker: "Scan",
    title: "We map every tracker before your users meet one",
    desc: "The crawler visits your pages exactly like a browser does — executing JavaScript, watching network requests, and recording every cookie write. Nothing is self-reported or guessed from a script list; we observe what your site actually does.",
    bullets: [
      "Headless crawl of up to 500 pages per scan",
      "Matches findings against 200+ known tracker signatures",
      "Unknown scripts flagged for manual categorisation",
      "Automatic re-scan when your site changes",
    ],
    visual: <DomainVisual />,
  },
  {
    n: "02",
    icon: Palette,
    kicker: "Customise",
    title: "Design a banner users don't resent",
    desc: "Consent rates live and die on banner design. The editor previews your banner on your actual site, in your colours and tone — because a banner that looks native earns more genuine opt-ins than any dark pattern ever will.",
    bullets: [
      "Live preview against your real site",
      "Full control: colours, fonts, copy, button labels",
      "Three placements: bottom bar, centred modal, corner widget",
      "30+ languages, auto-selected per visitor",
    ],
    visual: <EditorVisual />,
    flip: true,
  },
  {
    n: "03",
    icon: Code2,
    kicker: "Deploy",
    title: "One line of code. Everything switches on.",
    desc: "Drop a single async script tag into your site's head. From the next page load, blocking, consent collection, audit logging, geo-targeting, and analytics all run automatically. There is no step four.",
    bullets: [
      "Works with any CMS, framework, or static site",
      "Async loading — never blocks your page render",
      "Native install guides for WordPress, Shopify, GTM, Next.js",
      "Verify installation with one click from the dashboard",
    ],
    visual: <InstallVisual />,
  },
];

const LIFECYCLE = [
  { icon: Server, title: "Page loads", desc: "Your page starts rendering normally. Our script loads async from the CDN edge nearest the visitor." },
  { icon: Zap, title: "Script initialises", desc: "In under 1ms, Cookie Access hooks script execution and cookie writes — before any tracker runs." },
  { icon: ShieldAlert, title: "Trackers intercepted", desc: "Every non-essential script is held. Zero requests fire, zero cookies are written." },
  { icon: Globe2, title: "Region resolved", desc: "Visitor's jurisdiction detected at the edge. The legally-correct banner variant is selected." },
  { icon: MousePointerClick, title: "User decides", desc: "Accept, reject, or granular preferences. Accepted categories release instantly — no reload." },
  { icon: FileText, title: "Decision logged", desc: "Timestamp, IP hash, page URL, and categories written to the immutable audit trail. GDPR Art. 7 evidence, done." },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      kicker="How it works"
      title={
        <>
          Compliant in <span className="trust-gradient">under five minutes.</span>
        </>
      }
      subtitle="No developers required, no onboarding calls, no config files. Here is the entire process — including what happens under the hood on every page view."
      hero={
        <div className="flex flex-wrap gap-4 mt-8">
          <Link href="/signup" className="btn-brand shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl">
            Start the clock — it&apos;s free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      }
    >
      {/* ── Minute-by-minute timeline ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">The stopwatch test</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-navy-950 tracking-tight">
              Zero to compliant, <span className="trust-gradient">minute by minute.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TIMELINE.map(({ t, title, desc }, i) => (
              <div key={t} className="relative glass rounded-2xl p-5 glow-card-hover transition-all duration-300">
                <span className={`font-display text-lg font-bold ${i === TIMELINE.length - 1 ? "trust-gradient" : "text-brand-600"}`}>{t}</span>
                <h3 className="font-display text-sm font-bold text-navy-950 mt-2 mb-1.5 leading-snug">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                {i === TIMELINE.length - 1 && (
                  <CheckCircle2 className="absolute top-4 right-4 w-4 h-4 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Step deep dives ── */}
      <section className="py-20 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 space-y-24">
          {STEPS.map(({ n, icon: Icon, kicker, title, desc, bullets, visual, flip }) => (
            <div key={n} className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <div className="icon-tile w-11 h-11 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="font-display text-xs font-semibold tracking-[0.22em] uppercase text-brand-600">Step {n} · {kicker}</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 leading-[1.08] mb-4">{title}</h2>
                <p className="text-slate-500 leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div>{visual}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Under the hood ── */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-900">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="absolute top-[-100px] left-1/3 w-[500px] h-[300px] bg-brand-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-300 mb-4">Under the hood</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
              What happens on <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">every page view.</span>
            </h2>
            <p className="text-navy-100/60 max-w-xl mx-auto">
              The full request lifecycle — from first byte to logged consent — in six steps.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {LIFECYCLE.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="glass-dark rounded-2xl p-6 hover:bg-brand-500/10 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="w-6 h-6 text-brand-300" strokeWidth={1.5} />
                  <span className="font-display text-2xl font-bold text-white/15">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-display text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-navy-100/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platforms ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
            Five minutes on <span className="trust-gradient">any platform.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-10">
            Step-by-step install guides for every major CMS and framework — most are a single paste.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {["WordPress", "Shopify", "Next.js", "Webflow", "Wix", "Squarespace", "React", "Vue", "Google Tag Manager", "Framer"].map((p) => (
              <span key={p} className="glass px-5 py-2.5 rounded-xl text-sm font-semibold text-navy-900 hover:text-brand-700 transition-colors cursor-default">
                {p}
              </span>
            ))}
          </div>
          <Link href="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors">
            Explore the full feature set
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <FinalCTA />
    </PageShell>
  );
}
