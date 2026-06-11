import { Scale, TrendingDown, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

const problems = [
  {
    icon: Scale,
    title: "GDPR fines are real, and they're growing",
    desc: "Regulators issued over €2.5 billion in fines in 2023 alone. The largest violations came not from data breaches — but from invalid or missing cookie consent.",
    stat: "€2.5B",
    statLabel: "in GDPR fines issued in 2023",
    accent: "red",
  },
  {
    icon: TrendingDown,
    title: "Users notice when something feels off",
    desc: "Intrusive or confusing cookie banners erode trust before a user reads a single word of your content. First impressions happen in under 50 milliseconds.",
    stat: "73%",
    statLabel: "of users who abandon sites that feel invasive",
    accent: "amber",
  },
  {
    icon: AlertTriangle,
    title: "A privacy incident can define your brand for years",
    desc: "The financial cost of a data breach averages $4.5M. The reputational cost — lost customers, press coverage, regulatory scrutiny — lasts far longer.",
    stat: "5+ years",
    statLabel: "average trust recovery time after a breach",
    accent: "orange",
  },
];

const accentMap = {
  red: { iconBg: "bg-red-500/15 text-red-400 border border-red-500/20", stat: "text-red-400" },
  amber: { iconBg: "bg-amber-500/15 text-amber-400 border border-amber-500/20", stat: "text-amber-400" },
  orange: { iconBg: "bg-orange-500/15 text-orange-400 border border-orange-500/20", stat: "text-orange-400" },
};

export default function Problem() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-brand-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-navy-500/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6 backdrop-blur">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-300 tracking-wide">The cost of inaction</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
            Privacy violations aren&apos;t just legal risks.{" "}
            <span className="text-red-400">They&apos;re trust violations.</span>
          </h2>
          <p className="text-navy-100/60 text-lg leading-relaxed">
            Once your users stop trusting you, they don&apos;t come back. The price of non-compliance
            is never just a fine — it&apos;s your reputation, and it compounds over time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {problems.map((p, i) => {
            const Icon = p.icon;
            const a = accentMap[p.accent];
            return (
              <div key={i} className="glass-dark rounded-2xl p-7 hover:bg-brand-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${a.iconBg}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3 leading-snug">{p.title}</h3>
                <p className="text-navy-100/55 text-sm leading-relaxed mb-6">{p.desc}</p>
                <div className={`text-3xl font-bold ${a.stat} mb-1 tabular-nums`}>{p.stat}</div>
                <div className="text-xs text-navy-100/40">{p.statLabel}</div>
              </div>
            );
          })}
        </div>

        <div className="glass-dark rounded-2xl p-8 max-w-2xl mx-auto text-center">
          <p className="text-lg font-semibold text-white mb-3">There&apos;s a better path.</p>
          <p className="text-navy-100/60 leading-relaxed mb-6">
            Cookie Access turns compliance into a signal of quality. When users see your consent
            banner, they don&apos;t see a legal formality — they see a company that respects them
            enough to ask.
          </p>
          <Link href="/signup" className="btn-brand shine inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl">
            Start protecting your users
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
