import { cn } from "@/lib/utils";

export function StatsCard({ title, value, subtitle, icon: Icon, color = "indigo", className }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <div className={cn("bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50 transition-all duration-300 hover:shadow-md hover:border-slate-300 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-500", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-slate-500 tracking-wide uppercase">{title}</h3>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", colorMap[color] || colorMap.indigo)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div>
        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{value}</div>
        {subtitle && (
          <p className="mt-1.5 text-[13px] font-medium text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
