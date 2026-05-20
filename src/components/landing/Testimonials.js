import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Alex Rivera",
    role: "Founder, SaaSFlow",
    avatar: "AR",
    avatarGradient: "from-blue-600 to-blue-800",
    industry: "SaaS",
    before: "Exposed to GDPR risk for 18 months",
    after: "Deployed and compliant in under 10 minutes",
    metric: "94% consent rate, first week",
    quote: "Switched to CookieAccess and had it live in under 10 minutes. The auto-detection caught trackers we didn't even know were running. Our legal team finally stopped sending us nervous emails.",
    stars: 5,
  },
  {
    name: "Sarah Chen",
    role: "CTO, NextGen Media",
    avatar: "SC",
    avatarGradient: "from-teal-500 to-teal-700",
    industry: "Media",
    before: "40+ tracking scripts across 12 sites, zero coverage",
    after: "Full compliance across every property",
    metric: "Zero compliance incidents in 14 months",
    quote: "We run a lot of third-party scripts across twelve sites. CookieAccess detected and categorised every single one without any manual work. The audit logs are exactly what our data protection officer needed.",
    stars: 5,
  },
  {
    name: "Marcus Thorne",
    role: "Lead Developer, Acme Corp",
    avatar: "MT",
    avatarGradient: "from-slate-600 to-slate-800",
    industry: "E-commerce",
    before: "Three other tools degraded our Core Web Vitals",
    after: "Lighthouse scores unchanged after deployment",
    metric: "Less than 1ms page load impact measured",
    quote: "We tested four consent managers. Every other one affected our performance scores. CookieAccess is genuinely undetectable in our metrics. That matters when you're optimising for every millisecond.",
    stars: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 mb-6">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs text-amber-700 tracking-wide">Customer stories</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-snug">
            Real companies. Measurable results.
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            These aren&apos;t cherry-picked quotes. They&apos;re the three most common things we hear
            from new customers in the first week.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-7 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <Quote className="w-6 h-6 text-blue-100 mb-4 flex-shrink-0" />

              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-600 leading-relaxed text-sm mb-6 flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-5 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-red-400 font-medium flex-shrink-0 mt-0.5">Before:</span>
                  <span className="text-slate-500">{t.before}</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-emerald-600 font-medium flex-shrink-0 mt-0.5">After:</span>
                  <span className="text-slate-700">{t.after}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-blue-700 font-medium">
                  {t.metric}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.avatarGradient} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-none mb-0.5">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
                <div className="ml-auto text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
                  {t.industry}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
