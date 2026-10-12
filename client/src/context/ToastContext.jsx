import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CircleCheck, className: 'border-emerald-200 bg-white text-slate-900', iconClass: 'text-emerald-600', label: 'Success' },
  error: { icon: CircleAlert, className: 'border-rose-200 bg-white text-slate-900', iconClass: 'text-rose-600', label: 'Error' },
  info: { icon: Info, className: 'border-slate-200 bg-white text-slate-900', iconClass: 'text-slate-500', label: 'Info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback((type, message) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-3), { id, type, message }]); // keep at most 4 on screen
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
  }, [dismiss]);

  // Stable object so pages can list `toast` in effect deps without re-running them
  const toast = useMemo(() => ({
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  }), [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Screen readers announce anything added to this region */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => {
          const { icon: Icon, className, iconClass, label } = STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border p-4 shadow-lg ${className}`}
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${iconClass}`} aria-hidden="true" />
              <p className="flex-1 text-sm">
                <span className="sr-only">{label}: </span>
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
