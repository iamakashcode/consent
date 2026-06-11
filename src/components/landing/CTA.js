import Link from "next/link";
import { ArrowRight, Shield, CheckCircle2, Lock } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Deep navy → purple gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800" />
      <div className="absolute inset-0 bg-grid-dark opacity-40" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-navy-400/20 blur-[110px] rounded-full pointer-events-none" />

      {/* Decorative rotating ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] rounded-full border border-brand-400/15 animate-spin-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border border-dashed border-brand-300/15 animate-spin-slow pointer-events-none" style={{ animationDirection: "reverse", animationDuration: "32s" }} />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <div className="glass-dark inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8">
          <Shield className="w-3.5 h-3.5 text-brand-300" />
          <span className="text-xs text-brand-200 tracking-wide">12,000+ companies across 130 countries</span>
        </div>

        <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6 leading-snug">
          Join the companies that
          <br />
          <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-300 bg-clip-text text-transparent">already made the switch</span>
        </h2>

        <p className="text-lg text-navy-100/65 mb-10 max-w-xl mx-auto leading-relaxed">
          Cookie compliance doesn&apos;t have to feel like a burden. The right tool makes it invisible
          to your team and meaningful to your users.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link href="/signup" className="shine inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-navy-900 bg-white rounded-xl shadow-2xl shadow-brand-500/25 hover:bg-brand-50 hover:scale-[1.03] transition-all duration-200">
            Start your free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#pricing" className="glass-dark inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-white hover:bg-brand-500/20 rounded-xl transition-colors duration-200">
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
            <div key={text} className="flex items-center gap-1.5 text-sm text-navy-100/60">
              <Icon className="w-3.5 h-3.5 text-brand-300 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
