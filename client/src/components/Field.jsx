import { CircleAlert } from 'lucide-react';

// Labelled input with an inline error underneath. The error is real text
// (not just a red border) and is linked to the input via aria-describedby.
export default function Field({ id, label, error, hint, className = '', children, ...inputProps }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  const controlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: `block h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 shadow-sm transition
      placeholder:text-slate-400 focus:outline-none focus-visible:outline-none focus:ring-2
      ${error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-100'}`,
    ...inputProps,
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {/* Pass a <select> as children; otherwise render an <input> */}
      {children ? <select {...controlProps}>{children}</select> : <input {...controlProps} />}
      {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-700">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
