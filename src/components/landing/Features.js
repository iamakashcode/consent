import { ShieldAlert, Fingerprint, Lock, PaintBucket, BarChart3, Globe2 } from "lucide-react";

const features = [
  {
    title: "Auto-Detection",
    desc: "Automatically scans your entire website to detect third-party scripts, cookies, and trackers without manual configuration.",
    icon: Fingerprint,
    color: "indigo",
  },
  {
    title: "Smart Blocking",
    desc: "Intercepts and blocks tracking scripts until explicit user consent is granted, ensuring absolute compliance.",
    icon: ShieldAlert,
    color: "violet",
  },
  {
    title: "GDPR & CCPA Ready",
    desc: "Pre-configured templates for major privacy regulations globally, including GDPR, CCPA, and ePrivacy Directive.",
    icon: Lock,
    color: "emerald",
  },
  {
    title: "Custom Branding",
    desc: "Match the consent banner to your brand's aesthetic with customizable colors, typography, and positioning.",
    icon: PaintBucket,
    color: "pink",
  },
  {
    title: "Analytics Dashboard",
    desc: "Monitor consent rates, page views, and user interaction trends through a detailed, real-time analytics dashboard.",
    icon: BarChart3,
    color: "blue",
  },
  {
    title: "Multi-Domain Support",
    desc: "Manage cookie consent across all your web properties from a single centralized dashboard.",
    icon: Globe2,
    color: "amber",
  },
];

const colorMap = {
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  pink: "bg-pink-50 text-pink-600 border-pink-100",
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
};

export default function Features() {
  return (
    <section id="features" className="py-10 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-20 text-center mx-auto">
          <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-6">
            Everything you need for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              absolute compliance
            </span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
            A comprehensive suite of tools designed to handle the complexity of global data privacy laws, so you can focus on building your product.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const c = colorMap[feature.color];
            return (
              <div
                key={i}
                className="group relative bg-white rounded-2xl border border-slate-100 p-8 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-6 transition-colors duration-300 ${c}`}>
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
