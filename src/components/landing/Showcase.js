import { ArrowRight } from "lucide-react";

export default function Showcase() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with slight gradient */}
      <div className="absolute inset-0 bg-slate-50/50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-indigo-100/50 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Real-time consent analytics & insights
          </h2>
          <p className="text-lg text-slate-500">
            Monitor interaction rates, track geographic compliance, and ensure your website adheres to international privacy standards effortlessly.
          </p>
        </div>

        {/* Large Dashboard Preview */}
        <div className="relative mx-auto max-w-5xl">
          {/* Glass framing effect */}
          <div className="absolute -inset-1 sm:-inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-violet-500/20 rounded-[2.5rem] blur-xl opacity-50" />
          
          <div className="relative bg-white rounded-2xl border border-slate-200/60 shadow-2xl shadow-slate-900/10 overflow-hidden">
            {/* Mock Header */}
            <div className="h-14 border-b border-slate-100 flex items-center px-6 gap-4 bg-slate-50/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
              </div>
              <div className="flex-1 max-w-md mx-auto h-7 bg-white rounded-md border border-slate-200" />
            </div>

            {/* Mock Body */}
            <div className="p-8 grid grid-cols-12 gap-6 bg-slate-50/20">
              {/* Sidebar rough mock */}
              <div className="col-span-3 space-y-4">
                <div className="h-8 bg-slate-100 rounded-lg w-full" />
                <div className="h-8 bg-indigo-50 border border-indigo-100 rounded-lg w-full" />
                <div className="h-8 bg-slate-100 rounded-lg w-3/4" />
                <div className="h-8 bg-slate-100 rounded-lg w-5/6" />
                <div className="h-8 bg-slate-100 rounded-lg w-full" />
              </div>

              {/* Main Content rough mock */}
              <div className="col-span-9 space-y-6">
                <div className="h-10 w-1/3 bg-slate-100 rounded-lg" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-28 bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                    <div className="h-4 w-1/2 bg-slate-100 rounded" />
                    <div className="h-8 w-1/3 bg-slate-200 rounded" />
                  </div>
                  <div className="h-28 bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                    <div className="h-4 w-1/2 bg-slate-100 rounded" />
                    <div className="h-8 w-1/3 bg-slate-200 rounded" />
                  </div>
                  <div className="h-28 bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                    <div className="h-4 w-1/2 bg-slate-100 rounded" />
                    <div className="h-8 w-1/3 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-64 bg-white border border-slate-100 shadow-sm rounded-xl" />
              </div>
            </div>
            
            {/* Overlay Gradient (fade bottom) */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
