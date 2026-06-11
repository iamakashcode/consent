import PageShell from "@/components/home/PageShell";
import { ArrowRight, MapPin, Clock, Briefcase, Zap, Globe, Code2, Coffee, Heart } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Careers",
  description:
    "Join the Cookie Access team. Help us build the privacy layer of the web — and do the best work of your career.",
};

const perks = [
  { icon: Globe, title: "Remote-first", desc: "Work from anywhere in the world." },
  { icon: Clock, title: "Flexible hours", desc: "Own your schedule, deliver your best." },
  { icon: Heart, title: "Health benefits", desc: "Comprehensive health & wellness coverage." },
  { icon: Zap, title: "Fast growth", desc: "Grow quickly in a high-impact role." },
  { icon: Coffee, title: "Home office budget", desc: "We kit out your workspace." },
  { icon: Code2, title: "Learning & development", desc: "Courses, conferences, and books on us." },
];

const openRoles = [
  { title: "Senior Frontend Engineer", dept: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Backend Engineer (Node.js)", dept: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Product Designer", dept: "Design", location: "Remote", type: "Full-time" },
  { title: "Compliance Analyst", dept: "Legal & Compliance", location: "Remote / India", type: "Full-time" },
  { title: "Growth Marketer", dept: "Marketing", location: "Remote", type: "Full-time" },
  { title: "Customer Success Manager", dept: "Customer Success", location: "Remote", type: "Full-time" },
];

const deptColors = {
  Engineering: "bg-brand-50 text-brand-700 border border-brand-200/60",
  Design: "bg-navy-50 text-navy-700 border border-navy-200/60",
  "Legal & Compliance": "bg-emerald-50 text-emerald-700 border border-emerald-100",
  Marketing: "bg-amber-50 text-amber-700 border border-amber-100",
  "Customer Success": "bg-brand-50 text-brand-700 border border-brand-200/60",
};

export default function CareerPage() {
  return (
    <PageShell
      kicker="We're hiring"
      title={
        <>
          Build the privacy layer <span className="trust-gradient">of the web.</span>
        </>
      }
      subtitle="Cookie Access is a small team with outsized impact. We move fast, care deeply about the product, and do some of the most meaningful work in the privacy space."
    >
      <section className="py-20 bg-white border-b border-brand-100/60">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
              Why <span className="trust-gradient">work here?</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              We take care of the team the same way we take care of our users — seriously.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass flex items-start gap-4 rounded-2xl p-5 glow-card-hover transition-all duration-200">
                <div className="icon-tile w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-navy-950 mb-1">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
              Open <span className="trust-gradient">positions.</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              All roles are remote unless noted. We welcome applications from anywhere.
            </p>
          </div>
          <div className="space-y-3">
            {openRoles.map(({ title, dept, location, type }) => (
              <div
                key={title}
                className="glass flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl px-6 py-5 glow-card-hover hover:border-brand-300 transition-all duration-200"
              >
                <div>
                  <h3 className="font-display font-bold text-navy-950">{title}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-lg ${deptColors[dept] || "bg-slate-100 text-slate-600"}`}>
                      {dept}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3 h-3" />
                      {location}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {type}
                    </span>
                  </div>
                </div>
                <Link
                  href="/contact-us"
                  className="btn-brand shine inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl flex-shrink-0"
                >
                  Apply
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-slate-500 mb-4">Don&apos;t see a role that fits? We&apos;d still love to hear from you.</p>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            >
              Send us an open application
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-900">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="absolute top-[-40%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-500/20 blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">Join us in building honest software.</h2>
          <p className="text-navy-100/60 mb-8 leading-relaxed">
            Privacy is not a feature — it&apos;s a responsibility. Come help us make the web more trustworthy.
          </p>
          <Link
            href="/contact-us"
            className="shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-navy-900 bg-white rounded-xl hover:bg-brand-50 shadow-xl transition-all duration-200 hover:-translate-y-px"
          >
            View open roles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
