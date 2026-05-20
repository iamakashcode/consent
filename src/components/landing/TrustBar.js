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
    <section className="bg-blue-950 border-y border-blue-900/50 py-5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <p className="text-blue-400 text-xs font-medium tracking-wide whitespace-nowrap flex-shrink-0">
            Certified &amp; compliant:
          </p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3 w-full">
            {certs.map((cert) => {
              const Icon = cert.icon;
              return (
                <div
                  key={cert.name}
                  title={cert.desc}
                  className="flex items-center gap-1.5 bg-blue-900/60 border border-blue-700/40 rounded-lg px-3 py-1.5 hover:bg-blue-800/60 transition-colors cursor-default"
                >
                  <Icon className="w-3 h-3 text-teal-400 flex-shrink-0" />
                  <span className="text-white text-xs font-medium">{cert.name}</span>
                  <span className="text-teal-400 text-[10px]">✓</span>
                </div>
              );
            })}
          </div>
          <p className="text-blue-500 text-xs font-semibold whitespace-nowrap flex-shrink-0 hidden lg:block">
            130+ countries covered
          </p>
        </div>
      </div>
    </section>
  );
}
