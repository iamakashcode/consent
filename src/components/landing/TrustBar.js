import { Shield, Lock, CheckCircle2, Award } from "lucide-react";

const certs = [
  { name: "GDPR", desc: "EU General Data Protection Regulation", icon: Shield },
  { name: "CCPA", desc: "California Consumer Privacy Act", icon: Lock },
  { name: "ePrivacy", desc: "EU ePrivacy Directive", icon: CheckCircle2 },
  { name: "LGPD", desc: "Brazil LGPD", icon: Shield },
  { name: "ISO 27001", desc: "Information Security Management", icon: Award },
  { name: "SOC 2 Type II", desc: "Service Organization Control", icon: CheckCircle2 },
];

export default function TrustBar() {
  return (
    <section className="relative py-5 overflow-hidden bg-gradient-to-r from-navy-900 via-navy-800 to-brand-900">
      <div className="absolute inset-0 bg-grid-dark opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-1/3 w-72 h-32 bg-brand-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <p className="text-brand-200 text-xs font-medium tracking-wide whitespace-nowrap flex-shrink-0">
            Certified &amp; compliant:
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3 w-full">
            {certs.map((cert) => {
              const Icon = cert.icon;
              return (
                <div
                  key={cert.name}
                  title={cert.desc}
                  className="glass-dark flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-brand-500/20 transition-colors cursor-default"
                >
                  <Icon className="w-3 h-3 text-brand-300 flex-shrink-0" />
                  <span className="text-white text-xs font-medium">{cert.name}</span>
                  <span className="text-brand-300 text-[10px]">✓</span>
                </div>
              );
            })}
          </div>
          <p className="text-brand-300/80 text-xs font-semibold whitespace-nowrap flex-shrink-0 hidden lg:block">
            130+ countries covered
          </p>
        </div>
      </div>
    </section>
  );
}
