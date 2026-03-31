import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 py-16 sm:p-12 animate-in fade-in zoom-in-95 duration-500",
        className
      )}
    >
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border-2 border-slate-100/50 mb-5 shadow-sm">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-slate-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-[14px] text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
