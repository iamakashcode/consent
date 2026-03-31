import { Globe, Eye, CheckCircle, TrendingUp } from "lucide-react";

const stats = [
  {
    icon: Globe,
    value: "12,000+",
    label: "Active Domains",
    desc: "Websites protected worldwide",
    color: "indigo",
  },
  {
    icon: Eye,
    value: "2.4B",
    label: "Page Views Tracked",
    desc: "Monthly consent interactions",
    color: "violet",
  },
  {
    icon: CheckCircle,
    value: "94.2%",
    label: "Avg. Consent Rate",
    desc: "Industry-leading acceptance",
    color: "emerald",
  },
  {
    icon: TrendingUp,
    value: "99.9%",
    label: "Uptime SLA",
    desc: "Enterprise-grade reliability",
    color: "amber",
  },
];

const colorMap = {
  indigo: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    value: "text-indigo-600",
    border: "border-indigo-100",
  },
  violet: {
    bg: "bg-violet-50",
    icon: "text-violet-600",
    value: "text-violet-600",
    border: "border-violet-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    value: "text-emerald-600",
    border: "border-emerald-100",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    value: "text-amber-600",
    border: "border-amber-100",
  },
};

export default function Stats() {
  return (
    <section className="py-5 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const c = colorMap[stat.color];
            return (
              <div
                key={stat.label}
                className="group relative bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`w-10 h-10 ${c.bg} ${c.border} border rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                </div>
                <p className={`text-3xl font-bold ${c.value} mb-1 leading-none`}>{stat.value}</p>
                <p className="text-sm font-semibold text-slate-800 mb-1">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
