import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarX, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { addDays, dayLabel, gymToday, formatTimeRange } from '../lib/time.js';
import { useToast } from '../context/ToastContext.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { PageHeader } from '../components/Layout.jsx';
import SessionCard from '../components/SessionCard.jsx';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../components/States.jsx';

const POLL_MS = 5000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function SessionsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const today = gymToday();
  const date = DATE_RE.test(params.get('date') ?? '') ? params.get('date') : today;

  // status: 'loading' | 'error' | 'ready'
  const [state, setState] = useState({ status: 'loading', sessions: [], error: null });
  const [pending, setPending] = useState({}); // sessionId -> 'book' | 'cancel' | 'join' | 'leave'
  const [justBooked, setJustBooked] = useState(null); // sessionId showing the success pop

  // Every load and every action bumps this. A load only applies its result if
  // nothing newer has happened since it started, so a slow poll can't overwrite
  // an optimistic update or data for a different date.
  const version = useRef(0);
  const inFlight = useRef(0); // number of actions running; polling pauses meanwhile

  const load = useCallback(async ({ silent = false } = {}) => {
    const mine = ++version.current;
    if (!silent) setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await api(`/sessions?date=${date}`);
      if (mine === version.current) setState({ status: 'ready', sessions: data.sessions, error: null });
    } catch (err) {
      // A failed background poll keeps showing the last good data
      if (mine === version.current && !silent) setState({ status: 'error', sessions: [], error: err });
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(() => {
    if (inFlight.current === 0) load({ silent: true });
  }, POLL_MS);

  const patchSession = (id, fn) =>
    setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? fn(x) : x)) }));

  // Runs one card action: marks it pending, invalidates in-flight polls,
  // and refreshes from the server afterwards whatever happened.
  async function runAction(session, kind, fn) {
    version.current++;
    inFlight.current++;
    setPending((p) => ({ ...p, [session.id]: kind }));
    try {
      await fn();
    } finally {
      inFlight.current--;
      setPending((p) => {
        const next = { ...p };
        delete next[session.id];
        return next;
      });
      load({ silent: true });
    }
  }

  // Optimistic: take the seat in the UI straight away, give it back if the server says no
  const book = (session) => runAction(session, 'book', async () => {
    patchSession(session.id, (s) => ({
      ...s,
      seatsRemaining: s.seatsRemaining - 1,
      bookedCount: s.bookedCount + 1,
      myBooking: { id: null, code: null, checkedInAt: null }, // placeholder until the server answers
    }));
    try {
      const { booking } = await api(`/sessions/${session.id}/bookings`, { method: 'POST' });
      patchSession(session.id, (s) => ({ ...s, myBooking: { id: booking.id, code: booking.code, checkedInAt: null } }));
      setJustBooked(session.id);
      setTimeout(() => setJustBooked((id) => (id === session.id ? null : id)), 1200);
      toast.success(`Booked ${formatTimeRange(session.startsAt)}. Your check-in code is ${booking.code}.`);
    } catch (err) {
      patchSession(session.id, (s) => ({
        ...s,
        seatsRemaining: s.seatsRemaining + 1,
        bookedCount: s.bookedCount - 1,
        myBooking: null,
      }));
      toast.error(`Couldn’t book: ${err.message}`);
    }
  });

  const cancel = (session) => {
    if (!window.confirm(`Cancel your booking for ${formatTimeRange(session.startsAt)}?`)) return;
    runAction(session, 'cancel', async () => {
      try {
        await api(`/bookings/${session.myBooking.id}`, { method: 'DELETE' });
        toast.info('Booking cancelled.');
      } catch (err) {
        toast.error(`Couldn’t cancel: ${err.message}`);
      }
    });
  };

  const join = (session) => runAction(session, 'join', async () => {
    try {
      const { waitlist } = await api(`/sessions/${session.id}/waitlist`, { method: 'POST' });
      toast.success(`You’re #${waitlist.position} on the waitlist. We’ll book you in automatically if a mat frees up.`);
    } catch (err) {
      toast.error(`Couldn’t join the waitlist: ${err.message}`);
    }
  });

  const leave = (session) => runAction(session, 'leave', async () => {
    try {
      await api(`/sessions/${session.id}/waitlist`, { method: 'DELETE' });
      toast.info('You left the waitlist.');
    } catch (err) {
      toast.error(`Couldn’t leave the waitlist: ${err.message}`);
    }
  });

  const goTo = (d) => setParams(d === today ? {} : { date: d });

  return (
    <>
      <PageHeader title="Sessions" subtitle="One-hour sessions, 20 mats each. All times are IST (Asia/Kolkata).">
        <DatePicker date={date} today={today} onChange={goTo} />
      </PageHeader>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{dayLabel(date)}</h2>

      {state.status === 'loading' && (
        <LoadingRegion label="Loading sessions…">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <SessionCardSkeleton key={i} />)}
          </div>
        </LoadingRegion>
      )}

      {state.status === 'error' && (
        <ErrorState title="Couldn’t load sessions" message={state.error?.message} onRetry={() => load()} />
      )}

      {state.status === 'ready' && state.sessions.length === 0 && (
        <EmptyState
          icon={CalendarX}
          title="No sessions on this day"
          message="Try another date — new sessions are added by the gym team."
          action={
            <button type="button" onClick={() => goTo(addDays(date, 1))}
              className="rounded-lg text-sm font-semibold text-emerald-700 hover:underline">
              Check the next day →
            </button>
          }
        />
      )}

      {state.status === 'ready' && state.sessions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              pending={pending[s.id] ?? null}
              justBooked={justBooked === s.id}
              onBook={book}
              onCancel={cancel}
              onJoin={join}
              onLeave={leave}
            />
          ))}
        </div>
      )}
    </>
  );
}

function DatePicker({ date, today, onChange }) {
  const iconBtn = 'grid size-11 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex w-full items-end gap-2 sm:w-auto">
      <button type="button" className={iconBtn} onClick={() => onChange(addDays(date, -1))}
        disabled={date <= today} aria-label="Previous day">
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 sm:flex-none">
        <label htmlFor="session-date" className="mb-1 block text-xs font-medium text-slate-600">Date</label>
        <input
          id="session-date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
        />
      </div>
      <button type="button" className={iconBtn} onClick={() => onChange(addDays(date, 1))} aria-label="Next day">
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
      {date !== today && (
        <button type="button" onClick={() => onChange(today)}
          className="h-11 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
          Today
        </button>
      )}
    </div>
  );
}

function SessionCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-4 w-28" />
      <Skeleton className="mt-2 h-2 w-full rounded-full" />
      <Skeleton className="mt-5 h-11 w-full rounded-xl" />
    </div>
  );
}
