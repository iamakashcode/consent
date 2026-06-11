import { Shield, Lock, Award, CheckCircle2 } from "lucide-react";

const CERTS = [
  { name: "GDPR", desc: "EU General Data Protection Regulation", icon: Shield },
  { name: "CCPA / CPRA", desc: "California Consumer Privacy Act", icon: Lock },
  { name: "ePrivacy", desc: "EU ePrivacy Directive", icon: CheckCircle2 },
  { name: "LGPD", desc: "Brazil LGPD", icon: Shield },
  { name: "ISO 27001", desc: "Information Security Management", icon: Award },
  { name: "SOC 2 Type II", desc: "Service Organization Control audit", icon: CheckCircle2 },
];

export default function CertBar() {
  return (
    <section aria-label="Certifications and compliance" className="relative py-5 overflow-hidden bg-gradient-to-r from-navy-900 via-navy-800 to-brand-900">
      <div className="absolute inset-0 bg-grid-dark opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-80 h-32 bg-brand-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-4">
        <p className="text-brand-200 text-xs font-semibold tracking-[0.18em] uppercase whitespace-nowrap flex-shrink-0">
          Certified &amp; audited
        </p>
        <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 flex-1">
          {CERTS.map(({ name, desc, icon: Icon }) => (
            <span key={name} title={desc} className="glass-dark flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-brand-500/20 transition-colors cursor-default">
              <Icon className="w-3 h-3 text-brand-300 flex-shrink-0" />
              <span className="text-white text-xs font-medium">{name}</span>
              <span className="text-brand-300 text-[10px]">✓</span>
            </span>
          ))}
        </div>
        <p className="text-brand-300/70 text-xs font-semibold whitespace-nowrap hidden xl:block">
          Annual third-party audits · reports available on request
        </p>
      </div>
    </section>
  );
}
