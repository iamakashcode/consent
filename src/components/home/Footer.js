import Link from "next/link";
import Image from "next/image";
import { Shield, Twitter, Linkedin, Github } from "lucide-react";

const COLS = [
  {
    title: "Product",
    links: [
      ["Features", "/features"],
      ["How it works", "/how-it-works"],
      ["Pricing", "/pricing"],
      ["Live demo", "/#platform"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About us", "/about-us"],
      ["Partners", "/partners"],
      ["Careers", "/career"],
      ["Contact", "/contact-us"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy policy", "/privacy-policy"],
      ["Terms", "/terms-and-condition"],
      ["Refund policy", "/refund-policy"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-navy-950 text-white overflow-hidden">
      {/* Gradient hairline */}
      <div className="h-px bg-brand-gradient-r" />
      <div className="absolute bottom-[-120px] right-[-80px] w-[400px] h-[300px] bg-brand-600/15 blur-[110px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-5 gap-10 mb-14">
          <div className="md:col-span-2">
            <Link href="/" className="inline-block mb-5 rounded-xl bg-white/95 px-3 py-2">
              <Image src="/cookie-access-logo.png" alt="Cookie Access" width={150} height={26} />
            </Link>
            <p className="text-sm text-navy-100/50 leading-relaxed max-w-xs mb-6">
              The consent platform for companies that treat privacy as a feature, not a fine.
            </p>
            <div className="flex gap-2">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl glass-dark flex items-center justify-center text-navy-100/60 hover:text-brand-300 hover:bg-brand-500/15 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-bold text-white mb-4">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-navy-100/50 hover:text-brand-300 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <p className="text-xs text-navy-100/40">© {new Date().getFullYear()} Cookie Access. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-navy-100/40">
              <Shield className="w-3.5 h-3.5 text-brand-400" /> GDPR · CCPA · SOC 2
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
