import Link from "next/link";
import { ArrowRight, Shield, CheckCircle2, Lock } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-950" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 opacity-90" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/12 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-800/50 border border-blue-700/40 mb-8">
          <Shield className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-xs text-teal-300 tracking-wide">12,000+ companies across 130 countries</span>
        </div>

        <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 leading-snug">
          Join the companies that
          <br />
          <span className="text-teal-400">already made the switch</span>
        </h2>

        <p className="text-lg text-blue-200/70 mb-10 max-w-xl mx-auto leading-relaxed">
          Cookie compliance doesn&apos;t have to feel like a burden. The right tool makes it invisible
          to your team and meaningful to your users.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-blue-900 bg-white rounded-xl shadow-xl hover:bg-blue-50 hover:scale-[1.02] transition-all duration-200">
            Start your free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#pricing" className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-white bg-blue-800/50 hover:bg-blue-800 border border-blue-700/50 rounded-xl backdrop-blur-sm transition-colors duration-200">
            View pricing
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          {[
            { icon: CheckCircle2, text: "14-day free trial" },
            { icon: Lock, text: "No credit card needed" },
            { icon: Shield, text: "Cancel anytime" },
            { icon: CheckCircle2, text: "GDPR & CCPA compliant" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-sm text-blue-300/70">
              <Icon className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
