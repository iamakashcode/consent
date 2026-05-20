import { BarChart3, CheckCircle2, Shield, TrendingUp } from "lucide-react";

export default function Showcase() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-slate-50">
      {/* Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-blue-100/40 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-700 tracking-wide">Analytics dashboard</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-snug">
            Everything you need to see,{" "}
            <span className="trust-gradient">in one place</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Consent rates, geographic breakdowns, domain-level analytics, and audit logs — all
            in a dashboard your whole team can actually understand.
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative mx-auto max-w-5xl">
          <div className="absolute -inset-3 bg-gradient-to-r from-blue-500/15 via-teal-500/15 to-blue-500/15 rounded-3xl blur-xl pointer-events-none" />

          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-blue-900/10 overflow-hidden">
            {/* Browser bar */}
            <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-5 gap-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <div className="w-3 h-3 rounded-full bg-amber-300" />
                <div className="w-3 h-3 rounded-full bg-emerald-300" />
              </div>
              <div className="flex-1 max-w-sm mx-auto">
                <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-teal-500" />
                  app.cookieaccess.io/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="p-6 grid grid-cols-12 gap-5 bg-slate-50/30">
              {/* Sidebar */}
              <div className="col-span-3 space-y-2">
                <div className="h-8 bg-white border border-slate-100 rounded-xl w-full shadow-sm" />
                <div className="h-8 bg-blue-700 rounded-xl w-full shadow-sm" />
                <div className="h-8 bg-white border border-slate-100 rounded-xl w-3/4 shadow-sm" />
                <div className="h-8 bg-white border border-slate-100 rounded-xl w-5/6 shadow-sm" />
                <div className="h-8 bg-white border border-slate-100 rounded-xl w-full shadow-sm" />
                <div className="mt-4 h-0.5 bg-slate-100 rounded" />
                <div className="h-6 bg-teal-50 border border-teal-100 rounded-lg w-full mt-2" />
                <div className="h-6 bg-white border border-slate-100 rounded-lg w-5/6" />
              </div>

              {/* Main content */}
              <div className="col-span-9 space-y-5">
                {/* Page title row */}
                <div className="flex items-center justify-between">
                  <div className="h-7 w-1/3 bg-slate-200 rounded-lg" />
                  <div className="h-7 w-24 bg-blue-700 rounded-lg" />
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Domains", value: "12", icon: Shield, up: true },
                    { label: "Consent Rate", value: "94.2%", icon: CheckCircle2, up: true },
                    { label: "Page Views", value: "248K", icon: BarChart3, up: true },
                    { label: "Uptime", value: "99.9%", icon: TrendingUp, up: true },
                  ].map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={i}
                        className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                            {m.label}
                          </p>
                          <Icon className="w-3 h-3 text-blue-500" />
                        </div>
                        <p className="text-lg font-black text-slate-900 leading-none">{m.value}</p>
                        <div className="mt-1 text-[9px] text-emerald-600 font-bold">↑ Growing</div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart area */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-1/4 bg-slate-200 rounded" />
                    <div className="h-5 w-20 bg-teal-50 border border-teal-100 rounded-full" />
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 55, 45, 70, 65, 80, 88, 85, 92, 90, 95, 94].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${h}%`,
                          background:
                            i >= 9
                              ? "linear-gradient(to top, #1D4ED8, #0EA5E9)"
                              : i >= 6
                              ? "linear-gradient(to top, #3B82F6, #60A5FA)"
                              : "linear-gradient(to top, #CBD5E1, #E2E8F0)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Domains table */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                  <div className="h-4 w-1/3 bg-slate-200 rounded mb-3" />
                  <div className="space-y-2">
                    {[96, 94, 91, 88].map((rate, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <div className={`h-3 bg-slate-100 rounded w-${20 + i * 4}`} style={{ width: `${80 + i * 16}px` }} />
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {rate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fade-out */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
