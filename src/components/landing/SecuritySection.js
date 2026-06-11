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
    <section className="relative py-16 md:py-24 bg-white overflow-hidden">
      <div className="absolute top-1/3 left-[-150px] w-[400px] h-[400px] bg-brand-100/40 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-xs text-navy-800 tracking-wide">Enterprise security</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-navy-950 mb-5 leading-snug">
              Your data. Your users.{" "}
              <span className="trust-gradient">Protected.</span>
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              We hold ourselves to the same standard we help you meet. Every piece of consent data
              we store is protected with the same rigour we&apos;d want protecting our own.
            </p>

            <div className="relative rounded-2xl p-5 overflow-hidden bg-gradient-to-br from-navy-950 to-navy-800 border border-brand-500/20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/15 blur-3xl rounded-full pointer-events-none" />
              <p className="relative text-sm font-medium text-white mb-2">Our core commitment:</p>
              <p className="relative text-navy-100/60 text-sm leading-relaxed italic">
                &ldquo;We will never sell, share, or monetise your users&apos; personal data or consent
                records. We earn revenue from subscriptions — not from your users&apos; information.&rdquo;
              </p>
              <p className="relative text-brand-300/70 text-xs font-medium mt-3">— Cookie Access Privacy Charter</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={i} className="group glass rounded-2xl p-6 glow-card-hover hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="icon-tile-soft w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-brand-700 bg-brand-50 border border-brand-200/70 px-2 py-0.5 rounded-full tracking-wide">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-navy-950 mb-2">{p.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-14 pt-10 border-t border-brand-100/70">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              "HTTPS enforced everywhere",
              "99.9% uptime SLA",
              "Breach notification within 72 hours",
              "Data deletion on request",
              "DPA available for enterprise",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
