"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Globe, TrendingUp, Star } from "lucide-react";

const stats = [
  { icon: Shield, value: 12000, suffix: "+", label: "Businesses protected", color: "text-blue-400" },
  { icon: Globe, value: 130, suffix: "+", label: "Countries covered", color: "text-teal-400" },
  { icon: TrendingUp, value: 99.99, suffix: "%", label: "Uptime SLA", color: "text-indigo-400", decimals: 2 },
  { icon: Star, value: 4.9, suffix: "★", label: "Average rating", color: "text-amber-400", decimals: 1 },
];

function Counter({ target, suffix, decimals = 0, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
}

export default function AboutCounters() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto -mb-8 relative z-10">
      {stats.map(({ icon: Icon, value, suffix, label, color, decimals }) => (
        <div
          key={label}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center hover:bg-white/10 transition-all duration-200"
        >
          <Icon className={`w-5 h-5 ${color} mx-auto mb-3`} />
          <p className="text-2xl md:text-3xl font-bold text-white mb-1">
            <Counter target={value} suffix={suffix} decimals={decimals} />
          </p>
          <p className="text-xs text-blue-300/70">{label}</p>
        </div>
      ))}
    </div>
  );
}
