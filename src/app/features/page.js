import Features from "@/components/landing/Features";
import PageShell from "@/components/home/PageShell";
import FinalCTA from "@/components/home/FinalCTA";
import Link from "next/link";
import {
  Fingerprint, ShieldAlert, FileText, BarChart3, PaintBucket, Globe2,
  CheckCircle2, Ban, ArrowRight, Zap, Lock, Eye,
} from "lucide-react";

export const metadata = {
  title: "Features",
  description:
    "Explore all Cookie Access features: automatic tracker detection, script blocking until consent, GDPR audit logs, real-time analytics, brand-matched banners, and geo-targeted consent rules.",
};

/* ── Visual: scan results ── */
function ScanVisual() {
  const found = [
    { name: "Google Analytics 4", cat: "Analytics", icon: BarChart3 },
    { name: "Meta Pixel", cat: "Marketing", icon: Eye },
    { name: "Hotjar", cat: "Analytics", icon: Eye },
    { name: "Intercom", cat: "Functional", icon: Eye },
    { name: "LinkedIn Insight", cat: "Marketing", icon: Eye },
  ];
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center gap-2 text-xs font-semibold text-navy-900">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Scan complete · yoursite.com
        </span>
        <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-full">
          5 trackers found in 38s
        </span>
      </div>
      <div className="space-y-2">
        {found.map(({ name, cat, icon: Icon }) => (
          <div key={name} className="flex items-center justify-between bg-white/80 border border-brand-100/70 rounded-xl px-3.5 py-2.5">
            <span className="flex items-center gap-2.5">
              <span className="icon-tile-soft w-7 h-7 rounded-lg flex items-center justify-center">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-medium text-navy-950">{name}</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              cat === "Marketing" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-brand-50 text-brand-700 border border-brand-200/60"
            }`}>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Visual: blocking ── */
function BlockingVisual() {
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-b from-navy-900 to-navy-950 border border-brand-500/20 font-mono text-[12px] leading-relaxed">
      <p className="text-navy-100/40 text-[10px] tracking-widest uppercase mb-4">network requests · before consent</p>
      {[
        ["googletagmanager.com/gtag.js", true],
        ["connect.facebook.net/fbevents.js", true],
        ["static.hotjar.com/hotjar.js", true],
        ["cdn.cookieaccess.io/ca.js", false],
      ].map(([url, blocked]) => (
        <p key={url} className="flex items-center gap-2 mb-1.5">
          {blocked ? <Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          <span className={blocked ? "text-navy-100/50 line-through" : "text-emerald-300"}>{url}</span>
          <span className={`ml-auto text-[10px] font-bold ${blocked ? "text-red-400" : "text-emerald-400"}`}>
            {blocked ? "BLOCKED" : "1.2 kb"}
          </span>
        </p>
      ))}
      <div className="mt-4 pt-3 border-t border-brand-500/15 text-[10px] text-navy-100/40">
        0 bytes of tracking data transmitted · 0 cookies written
      </div>
    </div>
  );
}

/* ── Visual: banner variants ── */
function BannerVisual() {
  return (
    <div className="glass rounded-3xl p-6 space-y-4">
      {/* Bottom bar variant */}
      <div className="rounded-xl border border-brand-100 bg-white p-3">
        <div className="h-10 rounded-lg bg-slate-100 mb-2" />
        <div className="rounded-lg bg-brand-gradient p-2.5 flex items-center justify-between">
          <span className="text-[10px] text-white/90 font-medium">🍪 We respect your choice</span>
          <span className="flex gap-1">
            <span className="text-[9px] font-bold bg-white text-brand-700 rounded px-2 py-0.5">Accept</span>
            <span className="text-[9px] font-bold bg-white/20 text-white rounded px-2 py-0.5">Reject</span>
          </span>
        </div>
        <p className="text-[9px] text-slate-400 mt-1.5 text-center">Bottom bar</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Modal variant */}
        <div className="rounded-xl border border-brand-100 bg-white p-3">
          <div className="relative h-20 rounded-lg bg-slate-100 flex items-center justify-center">
            <div className="w-3/4 rounded-md bg-white shadow-lg border border-brand-100 p-1.5">
              <div className="h-1.5 w-2/3 bg-navy-200 rounded mb-1" />
              <div className="h-1 w-full bg-slate-100 rounded mb-1.5" />
              <div className="flex gap-1">
                <div className="h-2 flex-1 rounded bg-brand-500" />
                <div className="h-2 flex-1 rounded bg-slate-200" />
              </div>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 text-center">Centred modal</p>
        </div>
        {/* Corner variant */}
        <div className="rounded-xl border border-brand-100 bg-white p-3">
          <div className="relative h-20 rounded-lg bg-slate-100">
            <div className="absolute bottom-1.5 right-1.5 w-1/2 rounded-md bg-white shadow-lg border border-brand-100 p-1.5">
              <div className="h-1 w-full bg-slate-100 rounded mb-1" />
              <div className="h-2 w-full rounded bg-brand-500" />
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 text-center">Corner widget</p>
        </div>
      </div>
    </div>
  );
}

/* ── Visual: geo rules ── */
function GeoVisual() {
  const rules = [
    { region: "🇪🇺 European Union", rule: "GDPR — opt-in required", color: "bg-brand-50 text-brand-700 border-brand-200/60" },
    { region: "🇺🇸 California", rule: "CCPA — opt-out + notice", color: "bg-navy-50 text-navy-700 border-navy-200/60" },
    { region: "🇧🇷 Brazil", rule: "LGPD — opt-in required", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { region: "🌏 Rest of world", rule: "Notice-only banner", color: "bg-slate-50 text-slate-600 border-slate-200" },
  ];
  return (
    <div className="glass rounded-3xl p-6">
      <p className="text-xs font-semibold text-navy-900 mb-4">One script · four behaviours, automatic by IP</p>
      <div className="space-y-2.5">
        {rules.map(({ region, rule, color }) => (
          <div key={region} className="flex items-center justify-between bg-white/80 border border-brand-100/70 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-navy-950">{region}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${color}`}>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEEP_DIVES = [
  {
    icon: Fingerprint,
    kicker: "Detection",
    title: "Auto-tracker detection that never goes stale",
    desc: "Add your domain and our crawler sweeps every page, intercepting outgoing requests, script loads, and cookie writes before a single visitor sees them. Each one is matched against our database of 200+ known trackers and categorised by regulation type.",
    bullets: [
      "Detects scripts, pixels, iframes, and cookies — first- and third-party",
      "Categorises by purpose: Analytics, Marketing, Functional, Preferences",
      "Re-scans automatically whenever your site changes",
      "New trackers flagged in your dashboard before they become a liability",
    ],
    visual: <ScanVisual />,
  },
  {
    icon: ShieldAlert,
    kicker: "Blocking",
    title: "Scripts stay blocked until consent — provably",
    desc: "Most consent tools fire trackers first and apologise later. Cookie Access intercepts every non-essential script in the browser, before any data leaves the page. Rejection means zero bytes transmitted — not 'fewer'.",
    bullets: [
      "Client-side interception runs before any tracked script executes",
      "Prior-session cookies in rejected categories are flagged for deletion",
      "Essential scripts (your app, your CDN) are never touched",
      "Accepted categories release instantly — no page reload",
    ],
    visual: <BlockingVisual />,
    flip: true,
  },
  {
    icon: PaintBucket,
    kicker: "Customisation",
    title: "A banner that looks like you designed it",
    desc: "Colours, typography, copy, button labels, position — all editable in a live preview editor. Choose a bottom bar, centred modal, or corner widget, in 30+ languages, auto-localised per visitor. Pro removes our branding entirely.",
    bullets: [
      "Live preview editor — see changes on your actual site",
      "Bottom bar, centred modal, or corner widget placement",
      "30+ languages with automatic visitor localisation",
      "White-label option on Pro",
    ],
    visual: <BannerVisual />,
  },
  {
    icon: Globe2,
    kicker: "Geo-targeting",
    title: "The right banner for every jurisdiction",
    desc: "GDPR wants opt-in. CCPA wants opt-out. Most of the world wants neither. Cookie Access reads the visitor's region and serves the legally-correct experience automatically — one script, every jurisdiction.",
    bullets: [
      "Region detection by IP, resolved at the edge in <5ms",
      "Opt-in, opt-out, or notice-only modes per region",
      "Per-region banner copy and language overrides",
      "Regulation templates updated by our legal team as laws change",
    ],
    visual: <GeoVisual />,
    flip: true,
  },
];

export default function FeaturesPage() {
  return (
    <PageShell
      kicker="Platform features"
      title={
        <>
          Everything you need to <span className="trust-gradient">earn user trust.</span>
        </>
      }
      subtitle="Auto-detection, script blocking, audit logs, analytics, and a banner that looks like your brand — all from one script that adds less than 1ms to page load."
      hero={
        <div className="flex flex-wrap gap-4 mt-8">
          <Link href="/signup" className="btn-brand shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl">
            Start free — 14 days
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/how-it-works" className="glass inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-navy-800 rounded-xl hover:bg-white/90 hover:text-brand-700 transition-all">
            See how it works
          </Link>
        </div>
      }
    >
      {/* ── Deep dives ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 space-y-24">
          {DEEP_DIVES.map(({ icon: Icon, kicker, title, desc, bullets, visual, flip }) => (
            <div key={title} className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="icon-tile w-11 h-11 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="font-display text-xs font-semibold tracking-[0.22em] uppercase text-brand-600">{kicker}</span>
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

      {/* ── Compliance trio strip ── */}
      <section className="relative py-16 overflow-hidden bg-gradient-to-r from-navy-900 via-navy-800 to-brand-900">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: FileText, title: "GDPR Art. 7 audit logs", desc: "Every decision logged with timestamp, IP hash, page URL, and categories — immutable, exportable, court-ready." },
            { icon: BarChart3, title: "Real-time analytics", desc: "Consent rates, geographic breakdowns, and per-domain trends, live. Know exactly how your banner performs." },
            { icon: Zap, title: "<1ms performance", desc: "CDN-delivered, async, invisible to Lighthouse. Your Core Web Vitals never notice us." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-dark rounded-2xl p-6">
              <Icon className="w-6 h-6 text-brand-300 mb-3" strokeWidth={1.5} />
              <h3 className="font-display text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-navy-100/55 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full grid (tilt cards) ── */}
      <Features />

      {/* ── Integrations ── */}
      <section className="py-20 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
            Works with <span className="trust-gradient">your stack.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-10">
            One script tag works everywhere. Native guides for the platforms your team already uses.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["WordPress", "Shopify", "Next.js", "Webflow", "Wix", "Squarespace", "React", "Vue", "Google Tag Manager", "Framer", "Ghost", "Laravel"].map((p) => (
              <span key={p} className="glass px-5 py-2.5 rounded-xl text-sm font-semibold text-navy-900 hover:text-brand-700 transition-colors cursor-default">
                {p}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-8 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-brand-500" />
            No dependencies, no jQuery, no conflicts — pure vanilla JS under 15 kb
          </p>
        </div>
      </section>

      <FinalCTA />
    </PageShell>
  );
}
