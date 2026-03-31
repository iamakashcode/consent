import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-900 opacity-80" />
      
      {/* Abstract Orbs */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[600px] h-[600px] bg-indigo-500/30 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-violet-500/30 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
          Ready to get compliant?
        </h2>
        <p className="text-xl text-indigo-100/80 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
          Join thousands of high-performing websites using ConsentFlow to handle global privacy laws effortlessly.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-slate-900 bg-white rounded-xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300"
          >
            Start Your Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl backdrop-blur-sm transition-colors duration-200"
          >
            Deploy to production
          </a>
        </div>
        <p className="mt-8 text-sm font-medium text-indigo-200/60">
          No credit card required. 14-day free trial on all plans.
        </p>
      </div>
    </section>
  );
}
