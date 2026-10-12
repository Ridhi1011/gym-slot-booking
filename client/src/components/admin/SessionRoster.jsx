import { useEffect, useState } from 'react';
import { CalendarX, RefreshCw, Users } from 'lucide-react';
import { addDays, dayLabel, formatTime, formatTimeRange } from '../../lib/time.js';
import { useApiData } from '../../hooks/useApiData.js';
import Panel from '../Panel.jsx';
import Badge from '../Badge.jsx';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../States.jsx';

export default function SessionRoster({ date, onDateChange, refreshKey }) {
  const list = useApiData(`/sessions?date=${date}`);
  const [selectedId, setSelectedId] = useState(null);
  const roster = useApiData(selectedId ? `/sessions/${selectedId}/bookings` : null);

  const sessions = list.data?.sessions ?? [];

  // Keep a valid selection. Default to the session running now (or the next one),
  // since that's the one the front desk is checking people into.
  useEffect(() => {
    if (list.status !== 'ready') return;
    if (sessions.some((s) => s.id === selectedId)) return;
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const current = sessions.find((s) => new Date(s.startsAt).getTime() > hourAgo);
    setSelectedId((current ?? sessions[0])?.id ?? null);
  }, [list.status, sessions, selectedId]);

  // Refetch quietly after a check-in or a new session
  useEffect(() => {
    if (refreshKey === 0) return;
    list.reload({ silent: true });
    roster.reload({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <Panel title="Bookings by session" icon={Users} id="roster-heading">
      <div className="mb-4 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="roster-date" className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
          <input
            id="roster-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <button
          type="button"
          onClick={() => { list.reload(); roster.reload(); }}
          className="grid size-11 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
          aria-label="Refresh bookings"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </button>
      </div>

      {list.status === 'loading' && (
        <LoadingRegion label="Loading sessions…">
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-28 rounded-xl" />)}
          </div>
        </LoadingRegion>
      )}
      {list.status === 'error' && (
        <ErrorState title="Couldn’t load sessions" message={list.error?.message} onRetry={() => list.reload()} />
      )}
      {list.status === 'ready' && sessions.length === 0 && (
        <EmptyState
          icon={CalendarX}
          title={`No sessions ${dayLabel(date).toLowerCase() === 'today' ? 'today' : `on ${dayLabel(date)}`}`}
          message="Create one with the form, or pick another date."
          action={
            <button type="button" onClick={() => onDateChange(addDays(date, 1))} className="rounded-lg text-sm font-semibold text-emerald-700 hover:underline">
              Next day →
            </button>
          }
        />
      )}

      {list.status === 'ready' && sessions.length > 0 && (
        <>
          {/* Session picker: a row of toggle buttons */}
          <div role="group" aria-label="Choose a session" className="flex flex-wrap gap-2">
            {sessions.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(s.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-semibold tabular-nums">{formatTime(s.startsAt)}</span>
                  <span className="block text-xs text-slate-500">{s.bookedCount}/{s.capacity} booked</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <RosterTable roster={roster} />
          </div>
        </>
      )}
    </Panel>
  );
}

function RosterTable({ roster }) {
  if (roster.status === 'idle') return null;
  if (roster.status === 'loading') {
    return (
      <LoadingRegion label="Loading bookings…">
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </LoadingRegion>
    );
  }
  if (roster.status === 'error') {
    return <ErrorState title="Couldn’t load bookings" message={roster.error?.message} onRetry={() => roster.reload()} />;
  }

  const { session, bookings, waitlist } = roster.data;
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const checkedIn = confirmed.filter((b) => b.checkedInAt).length;

  return (
    <div className="animate-fade-in">
      <p className="mb-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{formatTimeRange(session.startsAt)}</span>
        {' · '}{confirmed.length}/{session.capacity} booked · {checkedIn} checked in
      </p>

      {bookings.length === 0 ? (
        <EmptyState icon={Users} title="No bookings yet" message="Members will appear here as they book." />
      ) : (
        // Only the table scrolls sideways on narrow screens, never the page
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Bookings for {formatTimeRange(session.startsAt)}</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Member</th>
                <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2 font-semibold">Checked in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className={b.status === 'cancelled' ? 'text-slate-400' : ''}>
                  <td className="px-3 py-2.5">
                    <span className="block font-medium text-slate-900">{b.member.name}</span>
                    <span className="block text-xs text-slate-500">{b.member.email}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {b.status === 'confirmed' ? <Badge tone="emerald">Confirmed</Badge> : <Badge tone="slate">Cancelled</Badge>}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {b.status === 'cancelled' ? '—' : b.checkedInAt ? (
                      <span className="font-medium text-emerald-700">Yes, {formatTime(b.checkedInAt)}</span>
                    ) : 'Not yet'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {waitlist.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Waitlist ({waitlist.length})</h3>
          <ol className="space-y-1 text-sm">
            {waitlist.map((w) => (
              <li key={w.id} className="flex items-center gap-2">
                <Badge tone="amber">#{w.position}</Badge>
                <span className="text-slate-800">{w.member.name}</span>
                <span className="truncate text-xs text-slate-500">{w.member.email}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
