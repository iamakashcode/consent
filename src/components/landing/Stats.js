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
    colorClass: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    target: 2.4,
    suffix: "B+",
    decimals: 1,
    label: "Consent events handled",
    desc: "Interactions processed without a single compliance breach",
    icon: BarChart3,
    colorClass: "bg-teal-50 text-teal-600 border-teal-100",
  },
  {
    target: 94.2,
    suffix: "%",
    decimals: 1,
    label: "Average consent rate",
    desc: "Across all customer deployments — well above the 60% industry average",
    icon: CheckCircle2,
    colorClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    target: 99.9,
    suffix: "%",
    decimals: 1,
    label: "Uptime SLA",
    desc: "Enterprise reliability your legal and engineering teams can depend on",
    icon: Clock,
    colorClass: "bg-blue-50 text-blue-600 border-blue-100",
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
    <section className="py-14 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="group text-center hover:-translate-y-1 transition-transform duration-300">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${s.colorClass}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2 tabular-nums">
                  <Counter target={s.target} suffix={s.suffix} decimals={s.decimals || 0} />
                </div>
                <div className="text-sm font-medium text-slate-700 mb-1">{s.label}</div>
                <div className="text-xs text-slate-400 leading-relaxed max-w-[180px] mx-auto">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
