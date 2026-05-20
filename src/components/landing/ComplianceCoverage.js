import { Shield, Globe2, CheckCircle2 } from "lucide-react";

const regulations = [
  { name: "GDPR", region: "European Union", desc: "The world's most comprehensive data protection law — the standard everything else is measured against.", color: "blue" },
  { name: "CCPA / CPRA", region: "California, USA", desc: "California's privacy legislation and its updated amendment, covering over 39 million residents.", color: "teal" },
  { name: "ePrivacy", region: "European Union", desc: "The EU's specific rules on cookies, tracking, and electronic communications.", color: "blue" },
  { name: "LGPD", region: "Brazil", desc: "Brazil's data protection framework, closely modelled on the GDPR with its own unique requirements.", color: "teal" },
  { name: "PDPA", region: "Thailand & Singapore", desc: "Asia-Pacific data protection laws covering two of the region's most active digital economies.", color: "blue" },
  { name: "PIPEDA", region: "Canada", desc: "Canada's federal privacy law for private sector organisations handling personal information.", color: "teal" },
  { name: "APPI", region: "Japan", desc: "Japan's Act on Protection of Personal Information — recently strengthened with mandatory breach notifications.", color: "blue" },
  { name: "NDPR", region: "Nigeria", desc: "West Africa's leading privacy framework, with one of the strictest enforcement records on the continent.", color: "teal" },
];

export default function ComplianceCoverage() {
  return (
    <section id="compliance" className="py-16 md:py-24 bg-slate-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-900/50 border border-teal-700/30 mb-6">
            <Globe2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-teal-300 tracking-wide">Global coverage</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
            One platform.{" "}
            <span className="text-teal-400">Every privacy law.</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Your users are spread across the globe. So are your compliance obligations. CookieAccess
            covers every major regulation so you never have an unprotected gap.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {regulations.map((reg, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 hover:scale-[1.02] transition-transform duration-200 ${
                reg.color === "blue"
                  ? "bg-blue-900/25 border-blue-700/30 hover:border-blue-600/50"
                  : "bg-teal-900/15 border-teal-700/30 hover:border-teal-600/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className={`text-base font-semibold ${reg.color === "blue" ? "text-blue-300" : "text-teal-300"}`}>{reg.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{reg.region}</div>
                </div>
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${reg.color === "blue" ? "text-blue-500" : "text-teal-500"}`} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{reg.desc}</p>
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
              <div className="text-3xl font-bold text-white mb-1 tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          <Shield className="w-3.5 h-3.5 inline mr-1.5 text-teal-500" />
          Our legal team monitors regulation changes worldwide. Your compliance never goes stale.
        </p>
      </div>
    </section>
  );
}
