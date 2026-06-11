"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "Is Cookie Access actually GDPR compliant?",
    a: "Yes — and we're specific about what that means. Cookie Access satisfies GDPR Articles 4(11), 6, and 7, which define valid consent as freely given, specific, informed, and unambiguous. Our audit log captures timestamp, IP hash, page URL, and consent categories for every interaction — the evidence record supervisory authorities require under Article 7(1).",
  },
  {
    q: "How does the auto-detection actually work?",
    a: "When you add a domain, our crawler visits your site and intercepts all outgoing network requests, script loads, and cookie writes. We cross-reference these against our database of 200+ known trackers and categorise them by type (Analytics, Marketing, Preferences). The scan re-runs automatically whenever your site changes, so your configuration never goes stale.",
  },
  {
    q: "Will this slow down my site or hurt my Core Web Vitals?",
    a: "No, measurably. Our script is delivered via a global CDN with average TTFB under 20ms, loads asynchronously, and adds less than 1ms of execution time. We've tested on sites with 99+ Lighthouse performance scores and seen no regression.",
  },
  {
    q: "What happens when a user rejects cookies?",
    a: "Rejection is immediate and complete. Cookie Access prevents all non-essential scripts from loading or executing — in the browser, before any data is transmitted. Existing non-essential cookies from prior sessions are flagged for deletion, and the rejection is logged in your audit trail with the same detail as an acceptance.",
  },
  {
    q: "Where is consent data stored, and how is it secured?",
    a: "All consent logs are stored in EU data centres by default, encrypted at rest with AES-256 and in transit over TLS 1.3. We are SOC 2 Type II certified and complete annual third-party penetration tests. DPAs are available for enterprise customers.",
  },
  {
    q: "Do you sell or share any of our data?",
    a: "No. This is written into our Terms of Service, not just a marketing claim. Our revenue comes from subscriptions — not from your data or your users' behaviour. We do not sell, licence, share, or monetise consent data, usage data, or business data in any form.",
  },
  {
    q: "Can I fully customise the consent banner?",
    a: "Yes, on Starter and Pro. The banner editor covers colours, fonts, button labels, copy, positioning (bottom bar, corner widget, centred modal), and 30+ languages. Pro includes a white-label option to remove Cookie Access branding entirely.",
  },
  {
    q: "Which privacy regulations does Cookie Access cover?",
    a: "GDPR (EU), CCPA/CPRA (California), ePrivacy Directive (EU), LGPD (Brazil), PDPA (Thailand & Singapore), PIPEDA (Canada), APPI (Japan), and NDPR (Nigeria). Our legal team monitors regulatory changes worldwide and pushes template updates to all active accounts automatically.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="relative py-24 md:py-32 overflow-hidden bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="absolute top-20 right-[-100px] w-[380px] h-[380px] bg-brand-100/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1fr_1.4fr] gap-12">
        {/* Sticky heading column */}
        <div className="lg:sticky lg:top-28 self-start">
          <p className="font-display text-sm font-semibold tracking-[0.25em] uppercase text-brand-600 mb-4">FAQ</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-navy-950 leading-[1.05] mb-5">
            Straight answers.<br />
            <span className="trust-gradient">No hedging.</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-6">
            The questions we get asked every day — answered the way we&apos;d want them answered.
          </p>
          <a href="mailto:support@cookieaccess.io" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors">
            Still unsure? Email our compliance team →
          </a>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`glass rounded-2xl overflow-hidden transition-all duration-200 ${
                open === i ? "shadow-lg shadow-brand-500/10" : "hover:border-brand-200"
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="font-display text-[15px] font-bold text-navy-950 pr-4 leading-snug">{faq.q}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  open === i ? "bg-brand-gradient text-white shadow-md shadow-brand-500/25" : "bg-brand-50 text-brand-600"
                }`}>
                  {open === i ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </span>
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
      </div>
    </section>
  );
}
