import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden px-4 sm:px-6">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-white to-violet-50/40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative patterns or shapes (Apple/Stripe inspired minimal lines) */}
      <div className="absolute top-0 right-0 p-12 opacity-20 hidden lg:block pointer-events-none">
        <svg width="404" height="384" fill="none" viewBox="0 0 404 384">
          <defs>
            <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="4" height="4" fill="currentColor" className="text-indigo-200" />
            </pattern>
          </defs>
          <rect width="404" height="384" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative w-full max-w-[420px] flex flex-col pt-8 pb-12">
        {/* Logo and Typography */}
        <div className="flex flex-col items-center mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-[15px] text-slate-500 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {children}
        </div>
      </div>
    </div>
  );
}
