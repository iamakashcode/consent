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
  red: { border: "border-red-800/40", iconBg: "bg-red-900/50 text-red-400", stat: "text-red-400" },
  amber: { border: "border-amber-800/40", iconBg: "bg-amber-900/50 text-amber-400", stat: "text-amber-400" },
  orange: { border: "border-orange-800/40", iconBg: "bg-orange-900/50 text-orange-400", stat: "text-orange-400" },
};

export default function Problem() {
  return (
    <section className="py-16 md:py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/40 border border-red-700/30 mb-6">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-300 tracking-wide">The cost of inaction</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
            Privacy violations aren&apos;t just legal risks.{" "}
            <span className="text-red-400">They&apos;re trust violations.</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Once your users stop trusting you, they don&apos;t come back. The price of non-compliance
            is never just a fine — it&apos;s your reputation, and it compounds over time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {problems.map((p, i) => {
            const Icon = p.icon;
            const a = accentMap[p.accent];
            return (
              <div key={i} className={`bg-slate-800/50 rounded-2xl border ${a.border} p-7 hover:bg-slate-800/70 transition-colors duration-200`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${a.iconBg}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3 leading-snug">{p.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">{p.desc}</p>
                <div className={`text-3xl font-bold ${a.stat} mb-1 tabular-nums`}>{p.stat}</div>
                <div className="text-xs text-slate-500">{p.statLabel}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-blue-900/30 border border-blue-700/30 rounded-2xl p-8 max-w-2xl mx-auto text-center">
          <p className="text-lg font-semibold text-white mb-3">There&apos;s a better path.</p>
          <p className="text-slate-400 leading-relaxed mb-6">
            CookieAccess turns compliance into a signal of quality. When users see your consent
            banner, they don&apos;t see a legal formality — they see a company that respects them
            enough to ask.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-xl bg-blue-700 hover:bg-blue-600 transition-colors">
            Start protecting your users
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
