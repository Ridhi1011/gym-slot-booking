import { withTransaction } from '../db.js';
import { generateCode } from '../lib/codes.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { lockSession, countConfirmed } from './sessionLock.js';

const toBookingDto = (b) => ({
  id: b.id,
  sessionId: b.session_id,
  status: b.status,
  code: b.code,
  checkedInAt: b.checked_in_at,
  createdAt: b.created_at,
  cancelledAt: b.cancelled_at,
});

// Inserts a confirmed booking with a fresh code. On the (very rare) code collision
// we roll back to a savepoint and try again — without the savepoint the unique
// violation would abort the whole transaction and we'd lose the session lock.
export async function insertBooking(client, sessionId, userId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await client.query('SAVEPOINT new_code');
    try {
      const { rows } = await client.query(
        `INSERT INTO bookings (session_id, user_id, status, code)
         VALUES ($1, $2, 'confirmed', $3)
         RETURNING *`,
        [sessionId, userId, generateCode()],
      );
      await client.query('RELEASE SAVEPOINT new_code');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT new_code');
      if (err.code === '23505' && err.constraint === 'bookings_code_key') continue;
      throw err;
    }
  }
  throw new Error('Could not generate a unique booking code');
}

export function bookSession(sessionId, userId) {
  return withTransaction(async (client) => {
    const session = await lockSession(client, sessionId);
    if (session.has_started) throw conflict('This session has already started', 'SESSION_STARTED');

    const { rowCount: alreadyBooked } = await client.query(
      `SELECT 1 FROM bookings WHERE session_id = $1 AND user_id = $2 AND status = 'confirmed'`,
      [sessionId, userId],
    );
    if (alreadyBooked) throw conflict('You already have a booking for this session', 'ALREADY_BOOKED');

    // Safe to trust this count: nobody else can add a booking while we hold the lock
    const booked = await countConfirmed(client, sessionId);
    if (booked >= session.capacity) throw conflict('Sorry, this session is full', 'SESSION_FULL');

    const booking = await insertBooking(client, sessionId, userId);

    // If they were waiting for this session, they don't need to any more
    await client.query('DELETE FROM waitlist WHERE session_id = $1 AND user_id = $2', [sessionId, userId]);

    return toBookingDto(booking);
  });
}

export function cancelBooking(bookingId, userId) {
  return withTransaction(async (client) => {
    // Find the session first so we can lock in the same order as booking does
    // (session row, then booking row) and avoid deadlocks.
    const { rows: found } = await client.query('SELECT session_id, user_id FROM bookings WHERE id = $1', [bookingId]);
    if (!found[0]) throw notFound('Booking not found', 'BOOKING_NOT_FOUND');
    if (found[0].user_id !== userId) throw forbidden('This is not your booking');

    const session = await lockSession(client, found[0].session_id);
    if (session.has_started) throw conflict('Bookings cannot be cancelled after the session starts', 'SESSION_STARTED');

    const { rows } = await client.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = now()
        WHERE id = $1 AND status = 'confirmed'
        RETURNING *`,
      [bookingId],
    );
    if (!rows[0]) throw conflict('This booking is already cancelled', 'ALREADY_CANCELLED');

    // Same transaction, session still locked: hand the freed seat to the waitlist
    const promoted = await promoteFromWaitlist(client, session);

    return { booking: toBookingDto(rows[0]), promotedCount: promoted.length };
  });
}

// Fills free seats from the waitlist, oldest entry first.
// Caller MUST already hold the session lock (see lockSession), which is why we
// don't need SKIP LOCKED or retries here — nobody else can touch this waitlist now.
export async function promoteFromWaitlist(client, session) {
  if (session.has_started) return []; // never promote into a session that's running

  const promoted = [];
  let free = session.capacity - (await countConfirmed(client, session.id));

  while (free > 0) {
    const { rows } = await client.query(
      `DELETE FROM waitlist
        WHERE id = (SELECT id FROM waitlist WHERE session_id = $1 ORDER BY created_at, id LIMIT 1)
        RETURNING user_id`,
      [session.id],
    );
    if (!rows[0]) break; // waitlist is empty

    const booking = await insertBooking(client, session.id, rows[0].user_id);
    promoted.push(booking);
    free--;
  }
  return promoted;
}
