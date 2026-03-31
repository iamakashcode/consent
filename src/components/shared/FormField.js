import { cn } from "@/lib/utils";

export function FormField({ label, htmlFor, description, children, error, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {description && <p className="text-[13px] text-slate-500 mb-1.5">{description}</p>}
      {children}
      {error && <p className="text-[13px] text-destructive mt-1.5 animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}

export const inputClasses = "w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-[15px] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50";
