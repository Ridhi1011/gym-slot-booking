import { Dumbbell } from 'lucide-react';

// Centered card used by the login and register pages
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-emerald-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <Dumbbell className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xl font-extrabold tracking-tight">MatSlot</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>}
      </div>
    </main>
  );
}

// Form-level error (e.g. "Wrong email or password") shown above the submit button
export function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {message}
    </p>
  );
}
