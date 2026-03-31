import { cn } from "@/lib/utils";

export function SectionCard({ children, className, noPadding = false, hoverLift = false }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-200/50",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        hoverLift && "transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300",
        !noPadding && "p-5 sm:p-6 lg:p-7",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionCardHeader({ title, description, icon: Icon, action, className }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100", className)}>
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100/50 text-slate-500">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">{title}</h2>
          {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionCardContent({ children, className }) {
  return <div className={cn("text-sm text-slate-600", className)}>{children}</div>;
}
