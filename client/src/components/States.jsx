import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

// Grey placeholder block for loading states
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} aria-hidden="true" />;
}

// Wraps skeletons so screen readers hear "Loading…" once instead of nothing
export function LoadingRegion({ label = 'Loading…', children }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, retrying = false }) {
  return (
    <div role="alert" className="animate-fade-in rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <CircleAlert className="mx-auto size-8 text-rose-600" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-rose-900">{title}</h2>
      {message && <p className="mt-1 text-sm text-rose-800">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw className="size-4" aria-hidden="true" />}
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="animate-fade-in rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Icon className="mx-auto size-8 text-slate-400" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-slate-800">{title}</h2>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
