"use client";

import { useState } from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "Is Cookie Access actually GDPR compliant?",
    a: "Yes — and we're specific about what that means. Cookie Access satisfies GDPR Articles 4(11), 6, and 7, which define valid consent as freely given, specific, informed, and unambiguous. Our audit log captures timestamp, IP hash, page URL, and consent categories for every interaction. This is the evidence record that supervisory authorities require under Article 7(1) when they investigate.",
  },
  {
    q: "How does the auto-detection actually work?",
    a: "When you add a domain, our crawler visits your site and intercepts all outgoing network requests, script loads, and cookie writes — before your users ever see them. We cross-reference these against our database of 200+ known trackers and categorise them by type (Analytics, Marketing, Preferences, etc.). The scan runs automatically whenever we detect a change on your site, so your consent configuration stays accurate without any manual maintenance.",
  },
  {
    q: "Will this slow down my site or hurt my Core Web Vitals?",
    a: "No, measurably. Our script is delivered via a global CDN with average TTFB under 20ms. It loads asynchronously and adds less than 1ms of execution time. We've tested on sites with 99+ Lighthouse performance scores and seen no regression. The blocking mechanism is client-side and runs before any tracked script executes — not as a wrapper that adds latency.",
  },
  {
    q: "What actually happens when a user rejects cookies?",
    a: "Rejection is immediate and complete. Cookie Access prevents all non-essential scripts from loading or executing — this happens in the browser before any data is transmitted. Any existing cookies from prior sessions that fall into non-essential categories are flagged for deletion. The rejection is logged in your audit trail with the same detail as an acceptance, so you have a complete record either way.",
  },
  {
    q: "Where is consent data stored, and how is it secured?",
    a: "All consent logs are stored in EU data centres by default, encrypted at rest with AES-256 and in transit over TLS 1.3. We are SOC 2 Type II certified and complete annual third-party penetration tests. We also offer Data Processing Agreements (DPAs) for enterprise customers who need formal documentation for their own compliance records.",
  },
  {
    q: "Do you sell or share any of our data?",
    a: "No. This is written into our Terms of Service, not just a marketing claim. We are a subscription software business — our revenue comes from your subscription, not from your data or your users' behaviour. We do not sell, licence, share, or monetise consent data, usage data, or business data in any form. If we're ever acquired, these restrictions transfer with us.",
  },
  {
    q: "Can I fully customise the consent banner?",
    a: "Yes, on Starter and Pro. The banner editor lets you customise colours, fonts, button labels, descriptive copy, positioning (bottom bar, corner widget, centred modal), and language — with 30+ localisations available. Pro also includes a white-label option to remove the Cookie Access branding entirely, so the experience is seamless for your users.",
  },
  {
    q: "Which privacy regulations does Cookie Access cover?",
    a: "Currently: GDPR (EU), CCPA/CPRA (California), ePrivacy Directive (EU), LGPD (Brazil), PDPA (Thailand & Singapore), PIPEDA (Canada), APPI (Japan), and NDPR (Nigeria). Our legal team monitors regulatory changes worldwide and pushes template updates to all active accounts automatically — you never need to check whether your configuration is still current.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-brand-50/40 to-white">
      <div className="absolute top-20 right-0 w-[350px] h-[350px] bg-brand-200/25 blur-[110px] rounded-full pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
            <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-xs text-navy-800 tracking-wide">Common questions</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy-950 mb-4 leading-snug">
            The questions we get asked <span className="trust-gradient">every day</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Straight answers — no sales language, no hedging. If something isn&apos;t clear after
            reading these, reach out and we&apos;ll tell you exactly what you need to know.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className={`glass rounded-2xl transition-all duration-200 overflow-hidden ${open === i ? "border-brand-300 shadow-lg shadow-brand-500/10" : "hover:border-brand-200"}`}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                <span className="text-sm font-medium text-navy-950 pr-4 leading-snug">{faq.q}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${open === i ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25" : "bg-brand-50 text-brand-600"}`}>
                  {open === i ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </div>
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <div className="h-px bg-gradient-to-r from-brand-200/60 to-transparent mb-4" />
                  <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-400">
            Still have questions?{" "}
            <a href="mailto:support@cookieaccess.io" className="text-brand-600 font-medium hover:text-brand-800 transition-colors">
              Email our compliance team →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
