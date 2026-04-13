/**
 * `action` is an alias for `children` (same slot). Some pages used `action` before the
 * component only supported `children`, which hid Save buttons entirely.
 */
export function PageHeader({ title, description, children, action, className = "" }) {
  const slot = action ?? children;
  return (
    <div className={`mb-8 sm:flex sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 ${className}`}>
      <div className="flex-1 min-w-0 mb-4 sm:mb-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[15px] sm:text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {slot && (
        <div className="flex shrink-0 items-center justify-start sm:justify-end gap-3">
          {slot}
        </div>
      )}
    </div>
  );
}
