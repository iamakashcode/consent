import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { ArrowRight, TrendingUp, Users, Gift, Code2, Building2, CheckCircle2, Handshake } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Partners | CookieAccess",
  description:
    "Join the CookieAccess partner program. Resell, integrate, or refer — and grow your business with privacy-first compliance tools.",
};

const partnerTypes = [
  {
    icon: Building2,
    title: "Reseller partners",
    desc: "Bundle CookieAccess into your agency or consultancy offering. Earn recurring commissions and provide your clients with best-in-class consent management.",
    perks: [
      "20–30% recurring commission",
      "Co-branded materials",
      "Priority support channel",
      "Dedicated partner manager",
    ],
  },
  {
    icon: Code2,
    title: "Technology partners",
    desc: "Integrate CookieAccess into your platform, CMS, or analytics tool. Build native consent flows your users can deploy in seconds.",
    perks: [
      "Public listing in our integration directory",
      "Joint go-to-market support",
      "API access & sandbox environment",
      "Co-marketing opportunities",
    ],
  },
  {
    icon: Users,
    title: "Referral partners",
    desc: "Refer businesses to CookieAccess and earn a commission on every successful signup — no reselling required.",
    perks: [
      "15% first-year commission",
      "Easy referral dashboard",
      "No minimum volume",
      "Instant payout on approval",
    ],
  },
];

const benefits = [
  { icon: TrendingUp, title: "Revenue share", desc: "Earn recurring commissions on every customer you bring." },
  { icon: Gift, title: "Co-marketing", desc: "Get featured in our newsletter, blog, and partner directory." },
  { icon: Handshake, title: "Dedicated support", desc: "A partner manager in your corner — not a support ticket queue." },
  { icon: CheckCircle2, title: "Compliance resources", desc: "Access our full compliance knowledge base and training materials." },
];

const currentPartners = ["Shopify", "WordPress", "HubSpot", "Google Tag Manager", "Segment", "Cloudflare"];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      <main>
        <section className="pt-24 pb-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full mb-6">
              <Handshake className="w-3.5 h-3.5" />
              Partner program
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
              Grow your business with
              <span className="text-blue-700"> privacy compliance</span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
              Join 200+ agencies, SaaS platforms, and consultancies that have made CookieAccess a core part of their
              stack and revenue stream.
            </p>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 shadow-lg shadow-blue-700/25 transition-all duration-200 hover:-translate-y-px"
            >
              Apply to become a partner
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Find your partnership model</h2>
              <p className="text-slate-500 max-w-xl mx-auto">Three ways to partner — pick the one that fits how you work.</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              {partnerTypes.map(({ icon: Icon, title, desc, perks }) => (
                <div
                  key={title}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 hover:shadow-md hover:border-blue-200 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2.5">
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                        <span className="text-sm text-slate-600">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">What you get</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
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
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Already integrated with</h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                CookieAccess works out of the box with platforms your customers already use.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {currentPartners.map((name) => (
                <div key={name} className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-blue-700">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to partner with us?</h2>
            <p className="text-blue-200 mb-8 leading-relaxed">
              Tell us about your business and we'll find the right partnership model together.
            </p>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 shadow-lg transition-all duration-200 hover:-translate-y-px"
            >
              Apply now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
