import { notFound } from '../lib/errors.js';

// Locks the session row for the rest of the transaction.
//
// Rule used everywhere: any code that changes a session's bookings or waitlist
// calls this FIRST. Two people grabbing the last seat at the same time both hit
// this line; Postgres lets one through and makes the other wait until the first
// commits. The second one then counts seats again and sees the session is full.
//
// clock_timestamp() (not now()) so "has started" is checked at the moment we get
// the lock, not when the transaction began.
export async function lockSession(client, sessionId) {
  const { rows } = await client.query(
    `SELECT id, starts_at, capacity, starts_at <= clock_timestamp() AS has_started
       FROM sessions WHERE id = $1
        FOR UPDATE`,
    [sessionId],
  );
  if (!rows[0]) throw notFound('Session not found', 'SESSION_NOT_FOUND');
  return rows[0];
}

export async function countConfirmed(client, sessionId) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM bookings WHERE session_id = $1 AND status = 'confirmed'`,
    [sessionId],
  );
  return rows[0].n;
}
