import { Globe, Paintbrush, Code2, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Globe,
    title: "Add Your Domain",
    desc: "Enter your website URL. We automatically scan and detect all cookies, trackers, and third-party scripts in seconds.",
  },
  {
    step: "02",
    icon: Paintbrush,
    title: "Customize Your Banner",
    desc: "Design a consent banner that matches your brand perfectly — colors, text, position, and language localization.",
  },
  {
    step: "03",
    icon: Code2,
    title: "Paste One Script",
    desc: "Copy a single line of JavaScript to your site. ConsentFlow handles blocking, consent recording, and full compliance.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-10 md:py-16 bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.15em] mb-4">
            How It Works
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-5">
            Compliant in under
            <br />
            <span className="text-indigo-600">5 minutes</span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            No developer needed. No complex setup. Just add your domain and go live.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Connector lines (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-slate-200 via-indigo-200 to-slate-200" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative group">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 h-full hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/8 transition-all duration-300 hover:-translate-y-1">
                  {/* Step number + icon row */}
                  <div className="flex items-center justify-between mb-8">
                    {/* Step circle */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 group-hover:border-indigo-300 flex items-center justify-center shadow-sm transition-colors">
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    {/* Step number */}
                    <span className="text-5xl font-black bg-gradient-to-br from-indigo-100 to-violet-100 bg-clip-text text-transparent select-none">
                      {step.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA nudge */}
        <div className="text-center mt-14">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group"
          >
            Start in 5 minutes — free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
