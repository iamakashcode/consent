import Link from "next/link";
import Image from "next/image";
import { Shield, CheckCircle2, Lock, Globe, Twitter, Linkedin, Github, ArrowUpRight } from "lucide-react";
import NewsletterForm from "@/components/landing/NewsletterForm";

const productLinks = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Compliance coverage", href: "/#compliance" },
  { label: "Analytics dashboard", href: "/#analytics" },
  { label: "Pricing", href: "/pricing" },
];

const resourceLinks = [
  { label: "Documentation", href: "#", external: true },
  { label: "API reference", href: "#", external: true },
  { label: "Changelog", href: "#", external: true },
  { label: "Status page", href: "#", external: true },
];

const companyLinks = [
  { label: "About us", href: "/about-us" },
  { label: "Partners", href: "/partners" },
  { label: "Careers", href: "/career" },
  { label: "Contact", href: "/contact-us" },
];

const legalLinks = [
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms & conditions", href: "/terms-and-condition" },
  { label: "Refund policy", href: "/refund-policy" },
  { label: "Cookie policy", href: "#" },
  { label: "DPA", href: "#" },
];

const certs = [
  { icon: Shield, label: "GDPR compliant" },
  { icon: Globe, label: "130+ countries" },
  { icon: Lock, label: "AES-256 encrypted" },
  { icon: CheckCircle2, label: "SOC 2 Type II" },
  { icon: Shield, label: "ISO 27001 aligned" },
];

const socials = [
  { icon: Twitter, href: "#", label: "X (Twitter)" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100">
      {/* Newsletter + social strip */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-1">Stay ahead of compliance changes</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Regulation updates, product news, and practical privacy guides — once a month, no fluff.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Main footer columns */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-10 mb-14">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-5">
              <Image src="/cookie-access-logo.png" alt="CookieAccess" width={160} height={28} />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-5">
              The consent management platform built for companies that take privacy seriously.
              Compliant, fast, and honest about what it does.
            </p>

            {/* Compliance badges */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {["GDPR", "CCPA", "SOC 2", "ePrivacy"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md font-medium"
                >
                  <Shield className="w-2.5 h-2.5" />
                  {badge}
                </span>
              ))}
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all duration-150"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-5 text-sm">Product</h4>
            <ul className="space-y-3">
              {productLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-slate-400 hover:text-blue-600 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-5 text-sm">Resources</h4>
            <ul className="space-y-3">
              {resourceLinks.map(({ label, href, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="text-sm text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                  >
                    {label}
                    {external && <ArrowUpRight className="w-3 h-3 opacity-60" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-5 text-sm">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-slate-400 hover:text-blue-600 transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-slate-800 mb-5 text-sm">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-slate-400 hover:text-blue-600 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust cert strip */}
        <div className="py-6 border-t border-slate-100 border-b border-slate-100 mb-6">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {certs.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                <Icon className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} CookieAccess. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-600 font-medium">All systems operational</span>
            </div>
            <span className="text-slate-200">|</span>
            <a
              href="mailto:support@cookieaccess.io"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
            >
              support@cookieaccess.io
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
