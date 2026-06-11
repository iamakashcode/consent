"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ArrowUpRight, ChevronDown, Users, Handshake, Briefcase, Mail } from "lucide-react";

const LINKS = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const COMPANY = [
  { label: "About us", href: "/about-us", icon: Users, desc: "Our mission and team" },
  { label: "Partners", href: "/partners", icon: Handshake, desc: "Agency & reseller program" },
  { label: "Careers", href: "/career", icon: Briefcase, desc: "Join the team" },
  { label: "Contact", href: "/contact-us", icon: Mail, desc: "Talk to a human" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none">
      <nav
        className={`pointer-events-auto mt-4 mx-4 flex items-center gap-1.5 rounded-2xl px-4 py-3 bg-white border transition-all duration-300 ${
          scrolled
            ? "border-brand-200 shadow-xl shadow-navy-800/12"
            : "border-brand-100 shadow-lg shadow-navy-800/8"
        }`}
      >
        <Link href="/" className="flex items-center pl-1 pr-4">
          <Image src="/cookie-access-logo.png" alt="Cookie Access" width={168} height={30} priority />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="px-4 py-2.5 text-[15px] font-semibold text-navy-900 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors"
            >
              {l.label}
            </Link>
          ))}

          {/* Company dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setCompanyOpen(true)}
            onMouseLeave={() => setCompanyOpen(false)}
          >
            <button
              className="flex items-center gap-1 px-4 py-2.5 text-[15px] font-semibold text-navy-900 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors"
              aria-expanded={companyOpen}
            >
              Company
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${companyOpen ? "rotate-180" : ""}`} />
            </button>

            {companyOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-72">
                <div className="bg-white border border-brand-100 rounded-2xl p-2 shadow-2xl shadow-navy-800/15">
                  {COMPANY.map(({ label, href, icon: Icon, desc }) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-brand-50 transition-colors"
                    >
                      <span className="icon-tile-soft w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-navy-950 leading-tight">{label}</span>
                        <span className="block text-xs text-slate-400 mt-0.5 leading-tight">{desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 pl-3">
          <Link
            href="/login"
            className="px-4 py-2.5 text-[15px] font-semibold text-navy-900/80 hover:text-navy-900 hover:bg-brand-50 rounded-xl transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="btn-brand shine inline-flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-semibold rounded-xl"
          >
            Get started
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <button
          className="md:hidden p-2.5 rounded-xl text-navy-900 hover:bg-brand-50"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="pointer-events-auto md:hidden fixed top-24 inset-x-4 bg-white border border-brand-100 rounded-2xl p-3 shadow-2xl shadow-navy-800/15 max-h-[70vh] overflow-y-auto">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-[15px] font-semibold text-navy-950 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Company</p>
          {COMPANY.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold text-navy-950 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors"
            >
              <Icon className="w-4 h-4 text-brand-500" />
              {label}
            </Link>
          ))}
          <div className="flex gap-2 p-2 pt-3 border-t border-brand-100/60 mt-2">
            <Link href="/login" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-navy-900 text-center border border-brand-200 rounded-xl">
              Sign in
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="btn-brand flex-1 px-4 py-2.5 text-sm font-semibold text-center rounded-xl">
              Get started
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
