"use client";

import Link from "next/link";
import { useState } from "react";
import { PLAN_DETAILS, PLAN_CURRENCY } from "@/lib/paddle";

// Icons as inline SVGs for simplicity
const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ScanIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BlockIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

export default function HomePage() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">ConsentFlow</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              GDPR & CCPA Compliant
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Cookie Consent
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Auto-detect trackers, block until consent, and stay compliant with GDPR, CCPA, and ePrivacy regulations. One script, complete protection.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
              >
                Start Free Trial
                <ArrowRightIcon />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                See How It Works
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-sm text-gray-400">consentflow.io/dashboard</span>
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Active Domains</p>
                    <p className="text-2xl font-bold text-white">12</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Page Views</p>
                    <p className="text-2xl font-bold text-white">248K</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Consent Rate</p>
                    <p className="text-2xl font-bold text-green-400">94%</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-400">Page Views Over Time</p>
                    <p className="text-xs text-indigo-400">Last 7 days</p>
                  </div>
                  <div className="h-32 flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Three Steps to Compliance</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get your website compliant with privacy regulations in under 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Add Your Domain",
                description: "Enter your website URL and we'll automatically scan for trackers and cookies.",
                icon: <GlobeIcon />,
              },
              {
                step: "02",
                title: "Customize Banner",
                description: "Design your consent banner to match your brand with our visual editor.",
                icon: <PaletteIcon />,
              },
              {
                step: "03",
                title: "Copy & Paste Script",
                description: "Add one line of code to your site. We handle blocking, consent, and compliance.",
                icon: <ShieldIcon />,
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-xl p-8 border border-gray-200 hover:border-indigo-200 hover:shadow-lg transition-all h-full">
                  <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                    {item.icon}
                  </div>
                  <div className="text-xs font-bold text-indigo-600 mb-2">{item.step}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-gray-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need for Compliance</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features to help you manage cookie consent across all your websites.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <ScanIcon />,
                title: "Auto-Detection",
                description: "Automatically scans and detects all trackers, cookies, and third-party scripts on your website.",
                color: "indigo",
              },
              {
                icon: <BlockIcon />,
                title: "Smart Blocking",
                description: "Blocks tracking scripts until user consent is given, ensuring full compliance.",
                color: "purple",
              },
              {
                icon: <ShieldIcon />,
                title: "GDPR & CCPA Ready",
                description: "Pre-configured for major privacy regulations including GDPR, CCPA, and ePrivacy.",
                color: "green",
              },
              {
                icon: <PaletteIcon />,
                title: "Custom Branding",
                description: "Match your consent banner to your brand with customizable colors, text, and positioning.",
                color: "pink",
              },
              {
                icon: <ChartIcon />,
                title: "Analytics Dashboard",
                description: "Track consent rates, page views, and user interactions with detailed analytics.",
                color: "blue",
              },
              {
                icon: <GlobeIcon />,
                title: "Multi-Domain",
                description: "Manage consent for multiple websites from a single dashboard with domain-level subscriptions.",
                color: "orange",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 bg-${feature.color}-50 rounded-lg flex items-center justify-center text-${feature.color}-600 mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Per-Domain Pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Each domain gets its own subscription. Start with a 14-day user-based free trial on all plans.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${billingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${billingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Yearly <span className="text-green-500 ml-1">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {Object.entries(PLAN_DETAILS).map(([planKey, plan], index) => {
              const price = billingCycle === "monthly" ? plan.monthly : plan.yearly;
              const period = billingCycle === "monthly" ? "/month" : "/year";
              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-xl p-8 border-2 transition-all ${plan.popular ? "border-indigo-500 shadow-xl scale-105" : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{PLAN_CURRENCY} {price}</span>
                    <span className="text-gray-500">{period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <CheckIcon />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`block w-full py-3 text-center font-medium rounded-lg transition-colors ${plan.popular
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    Start Free Trial
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Compliant?
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              Join thousands of websites using ConsentFlow to manage cookie consent and stay compliant with privacy regulations.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Start Your Free Trial
              <ArrowRightIcon />
            </Link>
            <p className="mt-4 text-sm text-indigo-200">
              No credit card required. 14-day free trial on all plans.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-lg font-semibold text-white">ConsentFlow</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Simple, powerful cookie consent management for modern websites.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 ConsentFlow. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">Trusted by 10,000+ websites</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-xs">🇪🇺</span>
                </div>
                <span className="text-xs">GDPR Ready</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
