import { Lock, ShieldCheck, Server, EyeOff, CheckCircle2 } from "lucide-react";

const pillars = [
  {
    icon: Lock,
    title: "AES-256 encryption",
    desc: "All consent data is encrypted at rest and in transit — the same standard used by banks, hospitals, and governments. Not optional. Default.",
    badge: "Military grade",
  },
  {
    icon: ShieldCheck,
    title: "SOC 2 Type II certified",
    desc: "We complete rigorous annual third-party security audits. The full report is available to enterprise customers on request — no hiding behind marketing claims.",
    badge: "Annual audit",
  },
  {
    icon: Server,
    title: "EU data residency",
    desc: "Your consent logs never leave the EU without your explicit instruction. We operate under GDPR Article 46 Standard Contractual Clauses.",
    badge: "GDPR Art. 46",
  },
  {
    icon: EyeOff,
    title: "We never sell your data",
    desc: "Not today, not if we're acquired, not ever. Your users' consent records are yours. We are a tool, not a data broker — and that distinction is written into our terms.",
    badge: "Our commitment",
  },
];

export default function SecuritySection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 tracking-wide">Enterprise security</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-5 leading-snug">
              Your data. Your users.{" "}
              <span className="trust-gradient">Protected.</span>
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              We hold ourselves to the same standard we help you meet. Every piece of consent data
              we store is protected with the same rigour we&apos;d want protecting our own.
            </p>

            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
              <p className="text-sm font-medium text-white mb-2">Our core commitment:</p>
              <p className="text-slate-400 text-sm leading-relaxed italic">
                &ldquo;We will never sell, share, or monetise your users&apos; personal data or consent
                records. We earn revenue from subscriptions — not from your users&apos; information.&rdquo;
              </p>
              <p className="text-slate-600 text-xs font-medium mt-3">— CookieAccess Privacy Charter</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="group bg-slate-50 rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 group-hover:border-blue-700 transition-colors duration-300">
                      <Icon className="w-4 h-4 text-blue-700 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full tracking-wide">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-14 pt-10 border-t border-slate-100">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              "HTTPS enforced everywhere",
              "99.9% uptime SLA",
              "Breach notification within 72 hours",
              "Data deletion on request",
              "DPA available for enterprise",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
