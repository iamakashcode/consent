import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Rivera",
    role: "Founder, SaaSFlow",
    avatar: "AR",
    text: "Switched to ConsentFlow and had it deployed in under 5 minutes. Cleanest dashboard in the industry and completely eliminated our compliance headaches.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    name: "Sarah Chen",
    role: "CTO, NextGen Media",
    avatar: "SC",
    text: "The auto-detection feature feels like magic. We run dozens of tracking scripts, and ConsentFlow caught them all without any manual setup required.",
    color: "from-violet-500 to-purple-500",
  },
  {
    name: "Marcus Thorne",
    role: "Lead Developer, Acme Corp",
    avatar: "MT",
    text: "We tested 4 different consent managers. Every other tool bloated our load times. ConsentFlow is undetectable performance-wise. Highly recommended.",
    color: "from-emerald-500 to-teal-500",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.15em] mb-4">
            Testimonials
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Loved by developers & founders
          </h2>
          <p className="text-lg text-slate-500">
            Don&apos;t just take our word for it. Here is what leading teams are saying.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed mb-8">&quot;{t.text}&quot;</p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-none mb-1">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
