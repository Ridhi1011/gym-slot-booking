// How full a session is. Width animates when the booked count changes.
export default function ProgressBar({ value, max, label }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const full = value >= max;
  const color = full ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max} booked`}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
