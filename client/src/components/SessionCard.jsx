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
      {/* Badges drop under the time on narrow cards instead of squashing it */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 id={`session-${session.id}-time`} className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tabular-nums text-slate-900">
          <Clock className="size-4 text-slate-400" aria-hidden="true" />
          {time}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {myBooking && <Badge tone="emerald" icon={Ticket}>Booked</Badge>}
          {myWaitlistPosition && <Badge tone="amber" icon={Hourglass}>Waitlisted #{myWaitlistPosition}</Badge>}
          {isFull && !myBooking && !hasStarted && <Badge tone="rose">FULL</Badge>}
          {hasStarted && <Badge tone="slate">{session.hasEnded ? 'Ended' : 'Started'}</Badge>}
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
  const timeId = `session-${session.id}-time`; // screen readers hear e.g. "Book a mat, 07:00 – 08:00"

  if (hasStarted) {
    let note = 'Booking closed';
    if (session.hasEnded) note = 'This session has finished';
    else if (myBooking?.checkedInAt) note = 'You’re checked in — enjoy!';
    else if (myBooking) note = 'In progress — check in at the front desk';
    return <p className="text-center text-sm text-slate-500">{note}</p>;
  }
  if (myBooking) {
    return (
      <Button variant="danger" className={full} aria-describedby={timeId} loading={busy} disabled={!myBooking.id}
        onClick={() => onCancel(session)}>
        {pending === 'book' ? 'Booking…' : 'Cancel booking'}
      </Button>
    );
  }
  if (myWaitlistPosition) {
    return (
      <Button variant="secondary" className={full} aria-describedby={timeId} loading={pending === 'leave'} disabled={busy}
        onClick={() => onLeave(session)}>
        Leave waitlist
      </Button>
    );
  }
  if (isFull) {
    return (
      <Button variant="secondary" className={full} aria-describedby={timeId} loading={pending === 'join'} disabled={busy}
        onClick={() => onJoin(session)}>
        Join waitlist
      </Button>
    );
  }
  return (
    <Button className={full} aria-describedby={timeId} loading={pending === 'book'} disabled={busy} onClick={() => onBook(session)}>
      Book a mat
    </Button>
  );
}
