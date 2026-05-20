import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Shield, Globe, ArrowRight, CheckCircle2, Zap, Lock } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "About Us | CookieAccess",
  description:
    "Learn about CookieAccess — our mission to make cookie consent simple, honest, and compliant for businesses worldwide.",
};

const values = [
  { icon: Shield, title: "Privacy by design", desc: "We build every feature with privacy as the foundation, not an afterthought." },
  { icon: Globe, title: "Global compliance", desc: "Supporting 130+ countries and every major privacy regulation on the planet." },
  { icon: Zap, title: "Radical simplicity", desc: "Complex compliance requirements translated into a three-step setup." },
  { icon: Lock, title: "Honest transparency", desc: "No dark patterns. We help you collect consent the right way." },
];

const stats = [
  { value: "12,000+", label: "Businesses protected" },
  { value: "130+", label: "Countries covered" },
  { value: "99.99%", label: "Uptime SLA" },
  { value: "4.9★", label: "Average rating" },
];

const team = [
  { name: "Akash Kumar", role: "CEO & Co-founder" },
  { name: "Priya Sharma", role: "CTO & Co-founder" },
  { name: "James Wilson", role: "Head of Compliance" },
  { name: "Sofia Mendes", role: "Head of Product" },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main>
        <section className="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full mb-6">
              <Shield className="w-3.5 h-3.5" />
              Our story
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
              Building trust on the internet,
              <span className="text-blue-700"> one consent at a time</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              CookieAccess was founded with a simple belief: privacy compliance should not require a legal team or a
              six-figure budget. We make it accessible, honest, and fast for any website.
            </p>
          </div>
        </section>

        <section className="py-16 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-blue-700 mb-2">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Our mission</h2>
                <p className="text-slate-500 leading-relaxed mb-4">
                  The web has a consent problem. Billions of cookie banners are shown every day, but most are designed to
                  confuse — dark patterns that push users toward accepting everything while giving them little real choice.
                </p>
                <p className="text-slate-500 leading-relaxed mb-4">
                  We started CookieAccess to fix this. Our platform makes it trivially easy to deploy a consent banner
                  that is genuinely transparent, legally compliant, and respectful of user preferences.
                </p>
                <p className="text-slate-500 leading-relaxed">
                  We believe privacy and business success are not in conflict. When users trust your site, they engage
                  more. When you respect consent, you build a better product.
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100">
                <ul className="space-y-4">
                  {[
                    "GDPR, CCPA, ePrivacy compliant out of the box",
                    "No dark patterns — ever",
                    "Lightweight script that doesn't slow your site",
                    "Full audit trail for every consent signal",
                    "Works across unlimited domains",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">What we stand for</h2>
              <p className="text-slate-500 max-w-xl mx-auto">Four principles that guide every decision we make.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">The team behind CookieAccess</h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Privacy engineers, compliance experts, and product designers — all obsessed with making consent simple.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map(({ name, role }) => (
                <div key={name} className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-700">{name.charAt(0)}</span>
                  </div>
                  <p className="font-semibold text-slate-800">{name}</p>
                  <p className="text-sm text-slate-400 mt-1">{role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-blue-700">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-blue-200 mb-8 leading-relaxed">
              Join 12,000+ businesses already protecting user privacy with CookieAccess.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 shadow-lg transition-all duration-200 hover:-translate-y-px"
            >
              Start free trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
