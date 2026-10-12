// Card shell used by the admin panels
export default function Panel({ title, icon: Icon, children, id }) {
  return (
    <section aria-labelledby={id} className="min-w-0 animate-fade-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={id} className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="size-5 text-emerald-600" aria-hidden="true" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
