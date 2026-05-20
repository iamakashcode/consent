import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import AboutCounters from "@/components/landing/AboutCounters";
import Link from "next/link";
import {
  Shield, Globe, ArrowRight, CheckCircle2, Zap, Lock,
  Users, Star, Heart,
} from "lucide-react";

export const metadata = {
  title: "About Us | CookieAccess",
  description:
    "Learn about CookieAccess — our mission to make cookie consent simple, honest, and compliant for businesses worldwide.",
};

const values = [
  {
    icon: Shield,
    title: "Privacy by design",
    desc: "We build every feature with privacy as the foundation, not an afterthought.",
    gradient: "from-blue-500 to-indigo-600",
    hover: "from-blue-50 to-indigo-50",
  },
  {
    icon: Globe,
    title: "Global by default",
    desc: "Built for 130+ countries and every major privacy regulation — from day one.",
    gradient: "from-teal-500 to-cyan-600",
    hover: "from-teal-50 to-cyan-50",
  },
  {
    icon: Zap,
    title: "Radical simplicity",
    desc: "Complex compliance reduced to a three-step setup. No lawyers required.",
    gradient: "from-amber-500 to-orange-600",
    hover: "from-amber-50 to-orange-50",
  },
  {
    icon: Heart,
    title: "User-first consent",
    desc: "No dark patterns. We help you earn trust, not manipulate it.",
    gradient: "from-rose-500 to-pink-600",
    hover: "from-rose-50 to-pink-50",
  },
];

const team = [
  {
    name: "Akash Kumar",
    role: "CEO & Co-founder",
    bio: "10 years building SaaS in fintech and regtech. Passionate about privacy law and developer experience.",
    initial: "A",
    color: "from-blue-400 to-indigo-600",
  },
  {
    name: "Priya Sharma",
    role: "CTO & Co-founder",
    bio: "Former principal engineer at a global CDN. Expert in distributed systems and edge computing.",
    initial: "P",
    color: "from-purple-400 to-pink-600",
  },
  {
    name: "James Wilson",
    role: "Head of Compliance",
    bio: "CIPP/E certified privacy attorney with 8 years of experience in GDPR and data protection law.",
    initial: "J",
    color: "from-teal-400 to-cyan-600",
  },
  {
    name: "Sofia Mendes",
    role: "Head of Product",
    bio: "Previously led product at a YC-backed startup. Turned compliance tools into products people love.",
    initial: "S",
    color: "from-orange-400 to-rose-500",
  },
];

const milestones = [
  {
    year: "2022",
    title: "Founded",
    desc: "CookieAccess started in a Mumbai co-working space with a simple idea: compliance shouldn't be painful.",
  },
  {
    year: "2023",
    title: "1,000 customers",
    desc: "Reached our first 1,000 paying customers within 8 months of launch. Raised seed funding.",
  },
  {
    year: "2024",
    title: "Global expansion",
    desc: "Launched support for 130+ jurisdictions. Hired our compliance and security teams.",
  },
  {
    year: "2025",
    title: "12,000+ customers",
    desc: "Crossed 12,000 active businesses. Launched enterprise tier with dedicated SLAs and custom DPAs.",
  },
];

const press = [
  { badge: "Product Hunt", detail: "#1 Product of the Day" },
  { badge: "G2", detail: "Leader — Privacy Management" },
  { badge: "Capterra", detail: "Best Ease of Use 2025" },
  { badge: "TechCrunch", detail: "Startup to Watch" },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative pt-24 pb-16 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
          {/* Animated orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="animate-orb1 absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[100px]" />
            <div className="animate-orb2 absolute top-[10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[90px]" />
            <div className="animate-orb3 absolute bottom-[0%] left-[30%] w-[400px] h-[400px] rounded-full bg-violet-600/15 blur-[80px]" />
          </div>
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center pb-16">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
                </span>
                Building the privacy layer of the web since 2022
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-[1.1]">
                We make the web{" "}
                <span className="bg-gradient-to-r from-teal-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  honest about privacy
                </span>
              </h1>

              <p className="text-lg md:text-xl text-blue-200/80 leading-relaxed max-w-2xl mx-auto mb-12">
                CookieAccess was built by engineers frustrated by the cookie consent industry — bloated scripts, dark
                patterns, and compliance theatre. We built the tool we wished existed.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-all duration-200 hover:-translate-y-px"
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/career"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-blue-200 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-all duration-200"
                >
                  <Users className="w-4 h-4" />
                  Join our team
                </Link>
              </div>
            </div>

            {/* Animated stat counters — float over the boundary */}
            <AboutCounters />
          </div>
        </section>

        {/* Spacer to account for the overlapping cards */}
        <div className="h-12 bg-white" />

        {/* ─── Story + Timeline ─── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-20 items-start">
              {/* Sticky text */}
              <div className="lg:sticky lg:top-28">
                <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full mb-5">
                  Our story
                </span>
                <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
                  We built what we{" "}
                  <span className="text-blue-700">wished existed</span>
                </h2>
                <p className="text-slate-500 leading-relaxed mb-4 text-base">
                  The web has a consent problem. Billions of cookie banners fire every day — most designed to confuse, not
                  inform. Dark patterns push users to accept everything. Businesses get fake consent, users get no real
                  choice.
                </p>
                <p className="text-slate-500 leading-relaxed mb-8 text-base">
                  We started CookieAccess to fix this. A platform so simple a developer deploys it in an afternoon, so
                  thorough a GDPR auditor is satisfied, and so honest that users actually trust it.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    "GDPR, CCPA, ePrivacy — compliant from day one",
                    "Sub-15 kb script that never slows your site",
                    "Full consent audit trail, tamper-proof",
                    "Zero dark patterns — ever, guaranteed",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-blue-300 via-indigo-200 to-transparent" />
                <div className="space-y-6">
                  {milestones.map(({ year, title, desc }) => (
                    <div key={year} className="relative pl-14 group">
                      <div className="absolute left-0 w-10 h-10 rounded-full bg-white border-2 border-blue-200 group-hover:border-blue-500 flex items-center justify-center shadow-sm transition-colors duration-200">
                        <span className="text-xs font-bold text-blue-600">{year.slice(2)}</span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group-hover:shadow-md group-hover:border-blue-100 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {year}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{title}</span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Values ─── */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full mb-5">
                Our values
              </span>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Four principles. Zero compromise.
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">
                Every feature, every line of code, every product decision runs through these filters first.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {values.map(({ icon: Icon, title, desc, gradient, hover }) => (
                <div
                  key={title}
                  className="group bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden cursor-default"
                >
                  {/* Hover background fill */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${hover} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Team ─── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full mb-5">
                The team
              </span>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
                People who care deeply about privacy
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">
                Engineers, lawyers, and designers with one shared obsession: making consent honest.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map(({ name, role, bio, initial, color }) => (
                <div
                  key={name}
                  className="group bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-center"
                >
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-105 transition-transform duration-300`}
                  >
                    <span className="text-2xl font-bold text-white">{initial}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">{name}</h3>
                  <p className="text-xs font-semibold text-blue-600 mt-1 mb-3">{role}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{bio}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/career"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Users className="w-4 h-4" />
                We're hiring — see open roles
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Press / Recognition ─── */}
        <section className="py-20 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-10">
              Recognised by
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {press.map(({ badge, detail }) => (
                <div
                  key={badge}
                  className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200"
                >
                  <p className="font-bold text-slate-800 mb-1.5">{badge}</p>
                  <p className="text-xs text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="relative py-28 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
          <div className="absolute inset-0 pointer-events-none">
            <div className="animate-orb1 absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/25 blur-[100px]" />
            <div className="animate-orb2 absolute bottom-[-20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/20 blur-[80px]" />
          </div>
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Join 12,000+ companies that{" "}
              <span className="bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">
                trust CookieAccess
              </span>
            </h2>
            <p className="text-blue-200/80 mb-10 text-lg leading-relaxed">
              Deploy in 5 minutes. No card required. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-blue-950 bg-white rounded-xl hover:bg-blue-50 shadow-xl transition-all duration-200 hover:-translate-y-px"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium text-blue-200 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-all duration-200"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
