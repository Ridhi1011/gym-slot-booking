import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Hourglass, Ticket } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDay, formatTimeRange } from '../lib/time.js';
import { useToast } from '../context/ToastContext.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { usePolling } from '../hooks/usePolling.js';
import { PageHeader } from '../components/Layout.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from '../components/States.jsx';

const POLL_MS = 5000;

export default function MyBookingsPage() {
  const toast = useToast();
  const { status, data, error, reload } = useApiData('/me/bookings');
  const [pending, setPending] = useState(null); // id of the booking / waitlist entry being changed

  usePolling(() => {
    if (!pending) reload({ silent: true });
  }, POLL_MS);

  // Spot auto-promotions: a session that was on my waitlist now shows up as a booking
  const waitingFor = useRef(null);
  useEffect(() => {
    if (!data) return;
    if (waitingFor.current) {
      for (const b of data.bookings) {
        if (b.status === 'confirmed' && waitingFor.current.has(b.sessionId)) {
          toast.success(`Good news! A mat freed up — you’re booked for ${formatDay(b.startsAt)}, ${formatTimeRange(b.startsAt)}.`);
        }
      }
    }
    waitingFor.current = new Set(data.waitlist.map((w) => w.sessionId));
  }, [data, toast]);

  async function cancel(booking) {
    const when = `${formatDay(booking.startsAt)}, ${formatTimeRange(booking.startsAt)}`;
    if (!window.confirm(`Cancel your booking for ${when}?`)) return;
    setPending(`b${booking.id}`);
    try {
      await api(`/bookings/${booking.id}`, { method: 'DELETE' });
      toast.info(`Booking for ${when} cancelled.`);
    } catch (err) {
      toast.error(`Couldn’t cancel: ${err.message}`);
    } finally {
      setPending(null);
      reload({ silent: true });
    }
  }

  async function leave(entry) {
    setPending(`w${entry.id}`);
    try {
      await api(`/sessions/${entry.sessionId}/waitlist`, { method: 'DELETE' });
      toast.info('You left the waitlist.');
    } catch (err) {
      toast.error(`Couldn’t leave the waitlist: ${err.message}`);
    } finally {
      setPending(null);
      reload({ silent: true });
    }
  }

  const header = <PageHeader title="My bookings" subtitle="Show your check-in code at the front desk when your session starts." />;

  if (status === 'loading') {
    return (
      <>
        {header}
        <LoadingRegion label="Loading your bookings…">
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-4 h-12 w-48" />
                <Skeleton className="mt-4 h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </LoadingRegion>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {header}
        <ErrorState title="Couldn’t load your bookings" message={error?.message} onRetry={() => reload()} />
      </>
    );
  }

  const upcoming = data.bookings.filter((b) => b.isUpcoming);
  const history = data.bookings.filter((b) => !b.isUpcoming);
  const nothingAhead = upcoming.length === 0 && data.waitlist.length === 0;

  return (
    <>
      {header}

      {nothingAhead && (
        <EmptyState
          icon={Ticket}
          title="No upcoming bookings"
          message="Pick a session and grab a mat."
          action={
            <Link to="/sessions" className="inline-flex h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
              Browse sessions
            </Link>
          }
        />
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="mb-10">
          <h2 id="upcoming-heading" className="mb-4 text-lg font-semibold">Upcoming</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {upcoming.map((b) => (
              <li key={b.id}>
                <BookingTicket booking={b} cancelling={pending === `b${b.id}`} disabled={!!pending} onCancel={cancel} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.waitlist.length > 0 && (
        <section aria-labelledby="waitlist-heading" className="mb-10">
          <h2 id="waitlist-heading" className="mb-4 text-lg font-semibold">Waitlist</h2>
          <ul className="space-y-3">
            {data.waitlist.map((w) => (
              <li key={w.id} className="flex animate-fade-in flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <Hourglass className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatDay(w.startsAt)} · {formatTimeRange(w.startsAt)}</p>
                  <p className="text-sm text-slate-600">
                    You’re <strong>#{w.position}</strong> in line. We’ll book you in automatically if a mat frees up.
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="w-full sm:w-auto" loading={pending === `w${w.id}`} disabled={!!pending} onClick={() => leave(w)}>
                  Leave waitlist
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 text-lg font-semibold">History</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-slate-700">{formatDay(b.startsAt)} · {formatTimeRange(b.startsAt)}</span>
                <HistoryBadge booking={b} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function BookingTicket({ booking, cancelling, disabled, onCancel }) {
  const { code, startsAt, hasStarted, checkedInAt } = booking;
  return (
    <article className="flex h-full animate-fade-in flex-col rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{formatDay(startsAt)}</h3>
          <p className="text-sm tabular-nums text-slate-600">{formatTimeRange(startsAt)}</p>
        </div>
        {checkedInAt
          ? <Badge tone="emerald" icon={CircleCheck}>Checked in</Badge>
          : hasStarted ? <Badge tone="amber">In progress</Badge> : <Badge tone="emerald">Confirmed</Badge>}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500" id={`code-label-${booking.id}`}>Check-in code</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p aria-labelledby={`code-label-${booking.id}`} className="select-all font-mono text-3xl font-bold tracking-[0.25em] text-slate-900 sm:text-4xl">
            {code}
          </p>
          <CopyButton text={code} label={`Copy check-in code ${code.split('').join(' ')}`} />
        </div>
      </div>

      <div className="mt-4 flex-1" />
      {hasStarted ? (
        <p className="text-sm text-slate-500">
          {checkedInAt ? 'You’re checked in. Enjoy your session!' : 'Session in progress — show this code at the desk.'}
        </p>
      ) : (
        <Button variant="danger" className="w-full" loading={cancelling} disabled={disabled} onClick={() => onCancel(booking)}>
          Cancel booking
        </Button>
      )}
    </article>
  );
}

function HistoryBadge({ booking }) {
  if (booking.status === 'cancelled') return <Badge tone="slate">Cancelled</Badge>;
  if (booking.checkedInAt) return <Badge tone="emerald">Attended</Badge>;
  return <Badge tone="rose">Missed</Badge>;
}
