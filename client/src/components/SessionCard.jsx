import { CircleCheck, Clock, Hourglass, Ticket } from 'lucide-react';
import { formatTimeRange } from '../lib/time.js';
import Badge from './Badge.jsx';
import Button from './Button.jsx';
import ProgressBar from './ProgressBar.jsx';

// pending: null | 'book' | 'cancel' | 'join' | 'leave' (which request is in flight)
export default function SessionCard({ session, pending, justBooked, onBook, onCancel, onJoin, onLeave }) {
  const { capacity, seatsRemaining, bookedCount, hasStarted, myBooking, myWaitlistPosition } = session;
  const isFull = seatsRemaining <= 0;
  const busy = pending !== null;
  const time = formatTimeRange(session.startsAt);

  return (
    <article
      aria-label={`Session ${time}`}
      className={`relative flex animate-fade-in flex-col rounded-2xl border bg-white p-5 shadow-sm transition duration-200
        hover:-translate-y-0.5 hover:shadow-md ${myBooking ? 'border-emerald-300' : 'border-slate-200'}
        ${hasStarted ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tabular-nums text-slate-900">
          <Clock className="size-4 text-slate-400" aria-hidden="true" />
          {time}
        </h2>
        <div className="flex flex-wrap justify-end gap-1.5">
          {myBooking && <Badge tone="emerald" icon={Ticket}>Booked</Badge>}
          {myWaitlistPosition && <Badge tone="amber" icon={Hourglass}>Waitlisted #{myWaitlistPosition}</Badge>}
          {isFull && !myBooking && <Badge tone="rose">FULL</Badge>}
          {hasStarted && <Badge tone="slate">Started</Badge>}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-900">{seatsRemaining} / {capacity}</span> mats left
          {session.waitlistCount > 0 && (
            <span className="text-slate-500"> · {session.waitlistCount} waiting</span>
          )}
        </p>
        <ProgressBar value={bookedCount} max={capacity} label={`Mats booked for ${time}`} />
      </div>

      <div className="mt-5">
        <CardAction
          session={session}
          pending={pending}
          busy={busy}
          isFull={isFull}
          onBook={onBook}
          onCancel={onCancel}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      </div>

      {/* Little "you're in" pop after a successful booking */}
      {justBooked && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-white/70" aria-hidden="true">
          <CircleCheck className="size-14 animate-pop text-emerald-600" />
        </div>
      )}
    </article>
  );
}

function CardAction({ session, pending, busy, isFull, onBook, onCancel, onJoin, onLeave }) {
  const { hasStarted, myBooking, myWaitlistPosition } = session;
  const full = 'w-full';

  if (hasStarted) {
    return (
      <p className="text-center text-sm text-slate-500">
        {myBooking ? 'In progress — check in at the front desk' : 'Booking closed'}
      </p>
    );
  }
  if (myBooking) {
    return (
      <Button variant="danger" className={full} loading={busy} disabled={!myBooking.id}
        onClick={() => onCancel(session)}>
        {pending === 'book' ? 'Booking…' : 'Cancel booking'}
      </Button>
    );
  }
  if (myWaitlistPosition) {
    return (
      <Button variant="secondary" className={full} loading={pending === 'leave'} disabled={busy}
        onClick={() => onLeave(session)}>
        Leave waitlist
      </Button>
    );
  }
  if (isFull) {
    return (
      <Button variant="secondary" className={full} loading={pending === 'join'} disabled={busy}
        onClick={() => onJoin(session)}>
        Join waitlist
      </Button>
    );
  }
  return (
    <Button className={full} loading={pending === 'book'} disabled={busy} onClick={() => onBook(session)}>
      Book a mat
    </Button>
  );
}
