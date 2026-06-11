"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Shield, Zap, BarChart3, Lock, FileCheck, Users, Handshake, Briefcase, Mail } from "lucide-react";
import Image from "next/image";

const NAV = [
  {
    label: "Product",
    children: [
      { label: "Features", href: "/features", icon: Zap, desc: "Everything you get out of the box" },
      { label: "How it works", href: "/how-it-works", icon: FileCheck, desc: "Three steps to compliance" },
      { label: "Analytics", href: "/#analytics", icon: BarChart3, desc: "Real-time consent dashboards" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
  {
    label: "Company",
    children: [
      { label: "About us", href: "/about-us", icon: Users, desc: "Our mission and team" },
      { label: "Partners", href: "/partners", icon: Handshake, desc: "Reseller and integration partnerships" },
      { label: "Careers", href: "/career", icon: Briefcase, desc: "Join our team" },
      { label: "Contact", href: "/contact-us", icon: Mail, desc: "Get in touch with us" },
    ],
  },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="sticky top-0 z-50">
      {/* Announcement bar */}
      {announcementVisible && (
        <div className="bg-brand-gradient-r text-white py-2 px-4 relative flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:flex items-center gap-1.5 text-white/90 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              New
            </span>
            <span className="text-white/85">
              GDPR Article 7 audit logging is now live —
            </span>
            <Link href="/#features" className="text-white font-semibold hover:text-brand-100 transition-colors underline underline-offset-2">
              See what changed
            </Link>
          </div>
          <button
            onClick={() => setAnnouncementVisible(false)}
            aria-label="Dismiss"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main header */}
      <header
        className={`transition-all duration-300 ${
          scrolled
            ? "bg-white/75 backdrop-blur-2xl shadow-lg shadow-navy-800/5 border-b border-brand-200/50"
            : "bg-white/60 backdrop-blur-xl border-b border-brand-100/40"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <Image src="/cookie-access-logo.png" alt="Cookie Access" width={160} height={28} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV.map((item) =>
                item.children ? (
                  <div key={item.label} className="relative">
                    <button
                      onMouseEnter={() => setOpenDropdown(item.label)}
                      onMouseLeave={() => setOpenDropdown(null)}
                      className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 hover:text-brand-700 font-medium rounded-lg hover:bg-brand-50 transition-all duration-150"
                    >
                      {item.label}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === item.label ? "rotate-180" : ""}`} />
                    </button>

                    {openDropdown === item.label && (
                      <div
                        onMouseEnter={() => setOpenDropdown(item.label)}
                        onMouseLeave={() => setOpenDropdown(null)}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64"
                      >
                        <div className="glass rounded-2xl p-2 overflow-hidden shadow-xl shadow-navy-800/10">
                          {item.children.map(({ label, href, icon: Icon, desc }) => (
                            <Link
                              key={label}
                              href={href}
                              className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-50/80 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-lg icon-tile-soft flex items-center justify-center flex-shrink-0 transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800 leading-tight">{label}</p>
                                <p className="text-xs text-slate-400 mt-0.5 leading-tight">{desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-brand-700 font-medium rounded-lg hover:bg-brand-50 transition-all duration-150"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-navy-800 rounded-lg hover:bg-brand-50 transition-all duration-150"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="btn-brand shine inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl"
              >
                <Shield className="w-3.5 h-3.5" />
                Start free trial
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-brand-50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-80 max-w-full bg-white z-50 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-100/60">
              <Image src="/cookie-access-logo.png" alt="Cookie Access" width={140} height={24} />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-brand-50 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="px-4 py-4 space-y-1">
              {NAV.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                    {item.children.map(({ label, href, icon: Icon }) => (
                      <Link
                        key={label}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-brand-700 rounded-xl hover:bg-brand-50 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-brand-400" />
                        {label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-brand-700 rounded-xl hover:bg-brand-50 transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>

            <div className="px-4 pt-2 pb-6 border-t border-brand-100/60 mt-2 space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full px-4 py-3 text-sm font-medium text-slate-700 text-center border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="btn-brand flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold rounded-xl"
              >
                <Shield className="w-4 h-4" />
                Start free trial
              </Link>
            </div>

            {/* Trust signal in drawer */}
            <div className="mx-4 mb-6 p-3 bg-brand-50/60 rounded-xl border border-brand-100">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-xs font-medium text-slate-700">Trusted by 12,000+ companies</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["GDPR", "CCPA", "SOC 2"].map((b) => (
                  <span key={b} className="text-[10px] text-brand-700 bg-white border border-brand-200 px-2 py-0.5 rounded-md font-medium">{b}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
