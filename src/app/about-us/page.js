import Nav from "@/components/home/Nav";
import Footer from "@/components/home/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";
import Link from "next/link";
import {
  Shield, Globe, ArrowRight, CheckCircle2, Zap,
  Users, Star, Heart,
} from "lucide-react";

export const metadata = {
  title: "About Us",
  description:
    "Learn about Cookie Access — our mission to make cookie consent simple, honest, and compliant for businesses worldwide.",
};

const values = [
  {
    icon: Shield,
    title: "Privacy by design",
    desc: "We build every feature with privacy as the foundation, not an afterthought.",
  },
  {
    icon: Globe,
    title: "Global by default",
    desc: "Built for 130+ countries and every major privacy regulation — from day one.",
  },
  {
    icon: Zap,
    title: "Radical simplicity",
    desc: "Complex compliance reduced to a three-step setup. No lawyers required.",
  },
  {
    icon: Heart,
    title: "User-first consent",
    desc: "No dark patterns. We help you earn trust, not manipulate it.",
  },
];

const team = [
  {
    name: "Akash Kumar",
    role: "CEO & Co-founder",
    bio: "10 years building SaaS in fintech and regtech. Passionate about privacy law and developer experience.",
    initial: "A",
    color: "from-brand-500 to-brand-700",
  },
  {
    name: "Priya Sharma",
    role: "CTO & Co-founder",
    bio: "Former principal engineer at a global CDN. Expert in distributed systems and edge computing.",
    initial: "P",
    color: "from-navy-600 to-navy-800",
  },
  {
    name: "James Wilson",
    role: "Head of Compliance",
    bio: "CIPP/E certified privacy attorney with 8 years of experience in GDPR and data protection law.",
    initial: "J",
    color: "from-brand-600 to-navy-700",
  },
  {
    name: "Sofia Mendes",
    role: "Head of Product",
    bio: "Previously led product at a YC-backed startup. Turned compliance tools into products people love.",
    initial: "S",
    color: "from-navy-500 to-brand-600",
  },
];

const milestones = [
  {
    year: "2022",
    title: "Founded",
    desc: "Cookie Access started in a Mumbai co-working space with a simple idea: compliance shouldn't be painful.",
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

const stats = [
  ["12,000+", "Active businesses"],
  ["2.4B+", "Consents processed"],
  ["130+", "Countries covered"],
  ["99.9%", "Uptime SLA"],
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <ScrollProgress />
      <Nav />

      <main>
        {/* ─── Hero ─── */}
        <section className="noise relative pt-36 pb-20 overflow-hidden bg-aurora">
          <div className="absolute inset-0 bg-grid grid-fade-mask pointer-events-none" />
          <div className="absolute top-[-120px] right-[-120px] w-[560px] h-[560px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(183,83,239,0.14) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-140px] left-[-140px] w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(18,11,125,0.1) 0%, transparent 70%)" }} />

          <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center pb-14">
              <div className="glass inline-flex items-center gap-2 text-xs font-semibold text-navy-800 px-4 py-2 rounded-full mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                </span>
                Building the privacy layer of the web since 2022
              </div>

              <h1 className="font-display font-bold text-navy-950 text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.02] mb-6">
                We make the web{" "}
                <span className="trust-gradient">honest about privacy.</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
                Cookie Access was built by engineers frustrated by the cookie consent industry — bloated scripts, dark
                patterns, and compliance theatre. We built the tool we wished existed.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup" className="btn-brand shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl">
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/career" className="glass inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-navy-800 rounded-xl hover:bg-white/90 hover:text-brand-700 transition-all duration-200">
                  <Users className="w-4 h-4" />
                  Join our team
                </Link>
              </div>
            </div>

            {/* Stats band */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-3xl overflow-hidden border border-brand-200/50 bg-brand-200/40 max-w-4xl mx-auto">
              {stats.map(([v, l]) => (
                <div key={l} className="bg-white/80 backdrop-blur px-6 py-6 text-center">
                  <p className="font-display text-3xl font-bold trust-gradient mb-1">{v}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Story + Timeline ─── */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-20 items-start">
              {/* Sticky text */}
              <div className="lg:sticky lg:top-28">
                <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">
                  Our story
                </p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 tracking-tight mb-6 leading-[1.05]">
                  We built what we{" "}
                  <span className="trust-gradient">wished existed.</span>
                </h2>
                <p className="text-slate-500 leading-relaxed mb-4 text-base">
                  The web has a consent problem. Billions of cookie banners fire every day — most designed to confuse, not
                  inform. Dark patterns push users to accept everything. Businesses get fake consent, users get no real
                  choice.
                </p>
                <p className="text-slate-500 leading-relaxed mb-8 text-base">
                  We started Cookie Access to fix this. A platform so simple a developer deploys it in an afternoon, so
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
                      <div className="icon-tile-soft w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm text-slate-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-brand-400 via-brand-200 to-transparent" />
                <div className="space-y-6">
                  {milestones.map(({ year, title, desc }) => (
                    <div key={year} className="relative pl-14 group">
                      <div className="absolute left-0 w-10 h-10 rounded-full bg-white border-2 border-brand-200 group-hover:border-brand-500 flex items-center justify-center shadow-sm transition-colors duration-200">
                        <span className="text-xs font-bold text-brand-600">{year.slice(2)}</span>
                      </div>
                      <div className="glass rounded-2xl p-5 glow-card-hover transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-md">
                            {year}
                          </span>
                          <span className="font-display text-sm font-bold text-navy-950">{title}</span>
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
        <section className="py-24 bg-gradient-to-b from-brand-50/40 to-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">
                Our values
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 tracking-tight mb-4">
                Four principles. <span className="trust-gradient">Zero compromise.</span>
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">
                Every feature, every line of code, every product decision runs through these filters first.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {values.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group glass rounded-3xl p-7 glow-card-hover hover:-translate-y-1.5 transition-all duration-300 cursor-default"
                >
                  <div className="icon-tile w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display font-bold text-navy-950 text-base mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Team ─── */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">
                The team
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 tracking-tight mb-4">
                People who care deeply <span className="trust-gradient">about privacy.</span>
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg">
                Engineers, lawyers, and designers with one shared obsession: making consent honest.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map(({ name, role, bio, initial, color }) => (
                <div
                  key={name}
                  className="group glass rounded-3xl p-7 glow-card-hover hover:-translate-y-1.5 transition-all duration-300 text-center"
                >
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300`}
                  >
                    <span className="font-display text-2xl font-bold text-white">{initial}</span>
                  </div>
                  <h3 className="font-display font-bold text-navy-950 text-base">{name}</h3>
                  <p className="text-xs font-semibold text-brand-600 mt-1 mb-3">{role}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{bio}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/career"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200/60 rounded-xl hover:bg-brand-100 transition-colors"
              >
                <Users className="w-4 h-4" />
                We&apos;re hiring — see open roles
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Press / Recognition ─── */}
        <section className="py-20 bg-gradient-to-b from-brand-50/40 to-white border-t border-brand-100/60">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-10">
              Recognised by
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {press.map(({ badge, detail }) => (
                <div
                  key={badge}
                  className="glass rounded-2xl p-6 text-center glow-card-hover transition-all duration-200"
                >
                  <p className="font-display font-bold text-navy-950 mb-1.5">{badge}</p>
                  <p className="text-xs text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="relative py-28 overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-900">
          <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
          <div className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-500/20 blur-[110px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-navy-400/20 blur-[90px] pointer-events-none" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Join 12,000+ companies that{" "}
              <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">
                trust Cookie Access.
              </span>
            </h2>
            <p className="text-navy-100/60 mb-10 text-lg leading-relaxed">
              Deploy in 5 minutes. No card required. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="shine inline-flex items-center gap-2 px-8 py-4 text-sm font-bold text-navy-900 bg-white rounded-xl hover:bg-brand-50 shadow-xl transition-all duration-200 hover:-translate-y-px"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact-us"
                className="glass-dark inline-flex items-center gap-2 px-8 py-4 text-sm font-medium text-white rounded-xl hover:bg-brand-500/20 transition-all duration-200"
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
