import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ArrowRight, MapPin, Clock, Briefcase, Zap, Globe, Code2, Coffee, Heart } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Careers | CookieAccess",
  description:
    "Join the CookieAccess team. Help us build the privacy layer of the web — and do the best work of your career.",
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
  Engineering: "bg-blue-50 text-blue-700",
  Design: "bg-purple-50 text-purple-700",
  "Legal & Compliance": "bg-teal-50 text-teal-700",
  Marketing: "bg-orange-50 text-orange-700",
  "Customer Success": "bg-green-50 text-green-700",
};

export default function CareerPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main>
        <section className="pt-24 pb-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full mb-6">
              <Briefcase className="w-3.5 h-3.5" />
              We're hiring
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
              Build the privacy layer
              <span className="text-blue-700"> of the web</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              CookieAccess is a small team with outsized impact. We move fast, care deeply about the product, and do
              some of the most meaningful work in the privacy space.
            </p>
          </div>
        </section>

        <section className="py-20 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Why work here?</h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                We take care of the team the same way we take care of our users — seriously.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {perks.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Open positions</h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                All roles are remote unless noted. We welcome applications from anywhere.
              </p>
            </div>
            <div className="space-y-3">
              {openRoles.map(({ title, dept, location, type }) => (
                <div
                  key={title}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl px-6 py-5 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                >
                  <div>
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-lg ${
                          deptColors[dept] || "bg-slate-100 text-slate-600"
                        }`}
                      >
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex-shrink-0"
                  >
                    Apply
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-slate-500 mb-4">Don't see a role that fits? We'd still love to hear from you.</p>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
              >
                Send us an open application
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-blue-700">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Join us in building honest software</h2>
            <p className="text-blue-200 mb-8 leading-relaxed">
              Privacy is not a feature — it's a responsibility. Come help us make the web more trustworthy.
            </p>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 shadow-lg transition-all duration-200 hover:-translate-y-px"
            >
              View open roles
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
