import Link from "next/link";
import { Zap } from "lucide-react";

const productLinks = [
  { label: "Features", href: "/features" },
  { label: "How it Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms and Condition", href: "/terms-and-condition" },
  { label: "Refund Policy", href: "/refund-policy" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-16">
          {/* Logo Column */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-6 group inline-flex">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-[17px] font-semibold text-slate-900 tracking-tight">
                ConsentFlow
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              The premium, zero-config cookie consent manager built to protect margins, maintain performance, and ensure total compliance globally.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-5">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-5">Company</h4>
            <ul className="space-y-3">
              {["About Us", "Careers", "Blog", "Contact", "Partners"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-5">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            © {new Date().getFullYear()} ConsentFlow Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 tracking-wide uppercase">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
