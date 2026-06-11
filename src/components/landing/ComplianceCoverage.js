import { Shield, Globe2, CheckCircle2 } from "lucide-react";

const regulations = [
  { name: "GDPR", region: "European Union", desc: "The world's most comprehensive data protection law — the standard everything else is measured against." },
  { name: "CCPA / CPRA", region: "California, USA", desc: "California's privacy legislation and its updated amendment, covering over 39 million residents." },
  { name: "ePrivacy", region: "European Union", desc: "The EU's specific rules on cookies, tracking, and electronic communications." },
  { name: "LGPD", region: "Brazil", desc: "Brazil's data protection framework, closely modelled on the GDPR with its own unique requirements." },
  { name: "PDPA", region: "Thailand & Singapore", desc: "Asia-Pacific data protection laws covering two of the region's most active digital economies." },
  { name: "PIPEDA", region: "Canada", desc: "Canada's federal privacy law for private sector organisations handling personal information." },
  { name: "APPI", region: "Japan", desc: "Japan's Act on Protection of Personal Information — recently strengthened with mandatory breach notifications." },
  { name: "NDPR", region: "Nigeria", desc: "West Africa's leading privacy framework, with one of the strictest enforcement records on the continent." },
];

export default function ComplianceCoverage() {
  return (
    <section id="compliance" className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-brand-900">
      <div className="absolute inset-0 bg-grid-dark opacity-50 pointer-events-none" />
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-500/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-navy-400/15 blur-[110px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="glass-dark inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
            <Globe2 className="w-3.5 h-3.5 text-brand-300" />
            <span className="text-xs text-brand-200 tracking-wide">Global coverage</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
            One platform.{" "}
            <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">Every privacy law.</span>
          </h2>
          <p className="text-navy-100/60 text-lg leading-relaxed">
            Your users are spread across the globe. So are your compliance obligations. Cookie Access
            covers every major regulation so you never have an unprotected gap.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {regulations.map((reg, i) => (
            <div
              key={i}
              className="glass-dark rounded-2xl p-5 hover:scale-[1.03] hover:bg-brand-500/15 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-base font-semibold text-brand-200">{reg.name}</div>
                  <div className="text-xs text-navy-100/40 mt-0.5">{reg.region}</div>
                </div>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-brand-400" />
              </div>
              <p className="text-xs text-navy-100/55 leading-relaxed">{reg.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {[
            { value: "130+", label: "Countries covered" },
            { value: "8+", label: "Major regulations" },
            { value: "Always", label: "Up to date" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent mb-1 tabular-nums">{s.value}</div>
              <div className="text-xs text-navy-100/50">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-navy-100/40 mt-8">
          <Shield className="w-3.5 h-3.5 inline mr-1.5 text-brand-400" />
          Our legal team monitors regulation changes worldwide. Your compliance never goes stale.
        </p>
      </div>
    </section>
  );
}
