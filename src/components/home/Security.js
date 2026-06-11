import { Lock, ShieldCheck, Server, EyeOff, Scale, BadgeCheck } from "lucide-react";

const PILLARS = [
  {
    icon: Lock,
    title: "AES-256 encryption",
    desc: "Consent data is encrypted at rest and in transit — the same standard banks and hospitals use. Not optional. Default.",
    badge: "Bank grade",
  },
  {
    icon: ShieldCheck,
    title: "SOC 2 Type II certified",
    desc: "Rigorous annual third-party security audits. The full report is available to enterprise customers — no hiding behind marketing claims.",
    badge: "Annual audit",
  },
  {
    icon: Server,
    title: "EU data residency",
    desc: "Your consent logs never leave the EU without your explicit instruction, under GDPR Article 46 Standard Contractual Clauses.",
    badge: "GDPR Art. 46",
  },
  {
    icon: EyeOff,
    title: "We never sell your data",
    desc: "Not today, not if we're acquired, not ever. We are a tool, not a data broker — and that distinction is written into our terms.",
    badge: "In our terms",
  },
];

const EXPERT_CREDS = ["CIPP/E certified", "Ex-DPO advisors", "EDPB guidance tracked", "Case-law monitoring"];

export default function Security() {
  return (
    <section id="security" className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="absolute top-1/3 left-[-150px] w-[420px] h-[420px] bg-brand-100/50 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">Why trust us</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 leading-[1.05] mb-6">
              Security you can audit.<br />
              <span className="trust-gradient">Expertise you can verify.</span>
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              We hold ourselves to the same standard we help you meet. Every claim on this page
              is backed by a certification, an audit report, or a contract clause you can read.
            </p>

            {/* Expertise block — the people behind the templates */}
            <div className="glass rounded-3xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-navy-950 leading-tight">Maintained by privacy professionals</h3>
                  <p className="text-xs text-slate-400">Not generic legal boilerplate</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Our compliance team — privacy lawyers and former data-protection officers — reviews
                every regulation template and pushes updates to all accounts the day guidance changes.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EXPERT_CREDS.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-200/60 rounded-md px-2 py-1">
                    <BadgeCheck className="w-3 h-3" />
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Privacy charter */}
            <div className="relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br from-navy-950 to-navy-800 border border-brand-500/20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/15 blur-3xl rounded-full pointer-events-none" />
              <p className="relative text-sm font-semibold text-white mb-2">Our core commitment</p>
              <p className="relative text-navy-100/60 text-sm leading-relaxed italic">
                &ldquo;We will never sell, share, or monetise your users&apos; personal data or consent
                records. We earn revenue from subscriptions — not from your users&apos; information.&rdquo;
              </p>
              <p className="relative text-brand-300/70 text-xs font-medium mt-3">— Cookie Access Privacy Charter</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {PILLARS.map(({ icon: Icon, title, desc, badge }) => (
              <div key={title} className="group glass rounded-3xl p-6 glow-card-hover hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-full tracking-wide">
                    {badge}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-navy-950 mb-2">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-brand-100/70 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {[
            "HTTPS enforced everywhere",
            "99.9% uptime SLA",
            "Breach notification within 72 hours",
            "Data deletion on request",
            "DPA available for enterprise",
          ].map((item) => (
            <span key={item} className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="w-4 h-4 text-brand-500 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
