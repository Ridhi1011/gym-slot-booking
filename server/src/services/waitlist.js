import { withTransaction } from '../db.js';
import { conflict, notFound } from '../lib/errors.js';
import { lockSession, countConfirmed } from './sessionLock.js';

// 1-based FIFO position of a member in a session's waitlist
async function positionOf(client, sessionId, userId) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS position
       FROM waitlist w, waitlist mine
      WHERE mine.session_id = $1 AND mine.user_id = $2
        AND w.session_id = $1 AND (w.created_at, w.id) <= (mine.created_at, mine.id)`,
    [sessionId, userId],
  );
  return rows[0].position;
}

export function joinWaitlist(sessionId, userId) {
  return withTransaction(async (client) => {
    // Locked so "is it full?" can't change between the check and the insert
    const session = await lockSession(client, sessionId);
    if (session.has_started) throw conflict('This session has already started', 'SESSION_STARTED');

    const { rowCount: hasBooking } = await client.query(
      `SELECT 1 FROM bookings WHERE session_id = $1 AND user_id = $2 AND status = 'confirmed'`,
      [sessionId, userId],
    );
    if (hasBooking) throw conflict('You already have a booking for this session', 'ALREADY_BOOKED');

    const booked = await countConfirmed(client, sessionId);
    if (booked < session.capacity) {
      throw conflict('There are still seats left — book it instead', 'SEATS_AVAILABLE');
    }

    // UNIQUE(session_id, user_id) turns a second join into 409 ALREADY_WAITLISTED
    await client.query('INSERT INTO waitlist (session_id, user_id) VALUES ($1, $2)', [sessionId, userId]);

    return { sessionId, position: await positionOf(client, sessionId, userId) };
  });
}

export function leaveWaitlist(sessionId, userId) {
  return withTransaction(async (client) => {
    // Lock too, so leaving can't interleave with a promotion that's picking the next person
    await lockSession(client, sessionId);
    const { rowCount } = await client.query(
      'DELETE FROM waitlist WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId],
    );
    if (!rowCount) throw notFound('You are not on the waitlist for this session', 'NOT_ON_WAITLIST');
    return { sessionId, left: true };
  });
}
