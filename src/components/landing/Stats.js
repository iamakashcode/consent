"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, BarChart3, CheckCircle2, Clock } from "lucide-react";

const stats = [
  {
    target: 12000,
    suffix: "+",
    label: "Companies protected",
    desc: "Active businesses that trust us with their compliance",
    icon: Building2,
  },
  {
    target: 2.4,
    suffix: "B+",
    decimals: 1,
    label: "Consent events handled",
    desc: "Interactions processed without a single compliance breach",
    icon: BarChart3,
  },
  {
    target: 94.2,
    suffix: "%",
    decimals: 1,
    label: "Average consent rate",
    desc: "Across all customer deployments — well above the 60% industry average",
    icon: CheckCircle2,
  },
  {
    target: 99.9,
    suffix: "%",
    decimals: 1,
    label: "Uptime SLA",
    desc: "Enterprise reliability your legal and engineering teams can depend on",
    icon: Clock,
  },
];

function Counter({ target, suffix, decimals = 0 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const fired = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          const duration = 1800;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(+(target * eased).toFixed(decimals));
            if (progress < 1) requestAnimationFrame(step);
            else setValue(target);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, decimals]);

  return (
    <span ref={ref}>
      {value.toFixed(decimals)}{suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section className="relative py-14 bg-white overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-brand-100/40 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="group glass glow-card-hover rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform duration-300">
                <div className="icon-tile w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="text-4xl font-bold trust-gradient mb-2 tabular-nums">
                  <Counter target={s.target} suffix={s.suffix} decimals={s.decimals || 0} />
                </div>
                <div className="text-sm font-medium text-navy-900 mb-1">{s.label}</div>
                <div className="text-xs text-slate-400 leading-relaxed max-w-[180px] mx-auto">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
