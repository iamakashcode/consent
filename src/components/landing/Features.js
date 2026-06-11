"use client";

import { useRef, useState } from "react";
import {
  ShieldAlert,
  Fingerprint,
  Lock,
  PaintBucket,
  BarChart3,
  Globe2,
  Shield,
  FileText,
  Zap,
} from "lucide-react";

const tabs = ["All", "Compliance", "Security", "Analytics", "Customisation"];

const features = [
  {
    title: "Auto-Tracker Detection",
    desc: "Automatically scans your entire website to detect third-party scripts, cookies, and pixels — no manual configuration. Ever.",
    icon: Fingerprint,
    tags: ["All", "Compliance", "Security"],
  },
  {
    title: "Smart Script Blocking",
    desc: "Intercepts and blocks all tracking scripts until the user grants explicit consent. Zero data leaves without permission.",
    icon: ShieldAlert,
    tags: ["All", "Security"],
  },
  {
    title: "GDPR, CCPA & ePrivacy Ready",
    desc: "Pre-configured legal templates for every major regulation. Our legal team keeps them updated as laws evolve.",
    icon: Lock,
    tags: ["All", "Compliance"],
  },
  {
    title: "Consent Audit Logs",
    desc: "Every consent decision is logged with timestamp, IP hash, and page URL — an immutable audit trail your legal team relies on.",
    icon: FileText,
    tags: ["All", "Compliance", "Security"],
  },
  {
    title: "Real-Time Analytics",
    desc: "Monitor consent rates, page views, and interaction trends live. Know exactly how your users respond to your banner.",
    icon: BarChart3,
    tags: ["All", "Analytics"],
  },
  {
    title: "Custom Brand Banner",
    desc: "Match the consent banner exactly to your brand — colours, typography, copy, and positioning — so it feels native.",
    icon: PaintBucket,
    tags: ["All", "Customisation"],
  },
  {
    title: "Multi-Domain Management",
    desc: "Manage cookie consent across all your web properties from one centralised dashboard. Perfect for agencies.",
    icon: Globe2,
    tags: ["All", "Analytics", "Customisation"],
  },
  {
    title: "Sub-ms Performance",
    desc: "Our CDN-delivered script adds less than 1ms to your page load. Compliance never comes at the cost of user experience.",
    icon: Zap,
    tags: ["All", "Security"],
  },
  {
    title: "Geo-Targeted Rules",
    desc: "Show different consent banners to users in different regions. GDPR for Europe, CCPA for California — automated by IP.",
    icon: Shield,
    tags: ["All", "Compliance", "Customisation"],
  },
];

/* ── 3D Tilt card wrapper ── */
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = -((y - cy) / cy) * 7;
    const rotY = ((x - cx) / cx) * 7;
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    el.style.transition = "transform 0.08s ease";
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    el.style.transition = "transform 0.55s cubic-bezier(0.23,1,0.32,1)";
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

export default function Features() {
  const [activeTab, setActiveTab] = useState("All");
  const filtered = features.filter((f) => f.tags.includes(activeTab));

  return (
    <section id="features" className="relative py-16 md:py-24 bg-white overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-brand-100/40 blur-[140px] rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12 reveal">
          <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
            <Shield className="w-4 h-4 text-brand-600" />
            <span className="text-xs text-navy-800 tracking-wide">
              Platform features
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy-950 mb-4 leading-snug">
            Everything you need to{" "}
            <span className="trust-gradient">earn user trust</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            A comprehensive suite of tools built to handle the complexity of global privacy laws —
            so you can focus on building your product.
          </p>
        </div>

        {/* Tab filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 reveal">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-semibold rounded-full border transition-all duration-200 ${
                activeTab === tab
                  ? "bg-brand-gradient text-white border-transparent shadow-lg shadow-brand-500/30 scale-105"
                  : "bg-white text-slate-600 border-brand-200/60 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Feature cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <TiltCard key={`${activeTab}-${i}`}>
                <div className="h-full bg-white/80 backdrop-blur rounded-2xl border border-brand-100 p-7 glow-card hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10 transition-[border-color,box-shadow] duration-300">
                  <div className="icon-tile w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-semibold text-navy-950 mb-2.5">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
