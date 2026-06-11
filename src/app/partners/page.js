import PageShell from "@/components/home/PageShell";
import { ArrowRight, TrendingUp, Users, Gift, Code2, Building2, CheckCircle2, Handshake } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Partners",
  description:
    "Join the Cookie Access partner program. Resell, integrate, or refer — and grow your business with privacy-first compliance tools.",
};

const partnerTypes = [
  {
    icon: Building2,
    title: "Reseller partners",
    desc: "Bundle Cookie Access into your agency or consultancy offering. Earn recurring commissions and provide your clients with best-in-class consent management.",
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
    desc: "Integrate Cookie Access into your platform, CMS, or analytics tool. Build native consent flows your users can deploy in seconds.",
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
    desc: "Refer businesses to Cookie Access and earn a commission on every successful signup — no reselling required.",
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
    <PageShell
      kicker="Partner program"
      title={
        <>
          Grow your business with <span className="trust-gradient">privacy compliance.</span>
        </>
      }
      subtitle="Join 200+ agencies, SaaS platforms, and consultancies that have made Cookie Access a core part of their stack and revenue stream."
      hero={
        <Link
          href="/contact-us"
          className="btn-brand shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl mt-8"
        >
          Apply to become a partner
          <ArrowRight className="w-4 h-4" />
        </Link>
      }
    >
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
              Find your <span className="trust-gradient">partnership model.</span>
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">Three ways to partner — pick the one that fits how you work.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {partnerTypes.map(({ icon: Icon, title, desc, perks }) => (
              <div
                key={title}
                className="glass rounded-3xl p-8 glow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className="icon-tile w-12 h-12 rounded-2xl flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-bold text-navy-950 mb-3">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">{desc}</p>
                <ul className="space-y-2.5">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
              What <span className="trust-gradient">you get.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-2xl p-6 text-center glow-card-hover transition-all duration-200">
                <div className="icon-tile w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-display font-bold text-navy-950 mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-950 tracking-tight mb-4">
              Already integrated with
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Cookie Access works out of the box with platforms your customers already use.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {currentPartners.map((name) => (
              <div key={name} className="glass px-6 py-3 rounded-xl text-sm font-semibold text-navy-900">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-900">
        <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" />
        <div className="absolute top-[-40%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-500/20 blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">Ready to partner with us?</h2>
          <p className="text-navy-100/60 mb-8 leading-relaxed">
            Tell us about your business and we&apos;ll find the right partnership model together.
          </p>
          <Link
            href="/contact-us"
            className="shine inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold text-navy-900 bg-white rounded-xl hover:bg-brand-50 shadow-xl transition-all duration-200 hover:-translate-y-px"
          >
            Apply now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
