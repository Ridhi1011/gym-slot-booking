import { withTransaction } from '../db.js';
import { conflict, notFound } from '../lib/errors.js';

// Admin enters a code at the door. Valid only for a confirmed booking,
// only during that session's hour, and only once.
export function checkInByCode(code) {
  return withTransaction(async (client) => {
    // FOR UPDATE OF b: if two admins type the same code at once, the second
    // waits here and then sees checked_in_at already set.
    const { rows } = await client.query(
      `SELECT b.id, b.status, b.checked_in_at, s.starts_at, u.name,
              clock_timestamp() < s.starts_at AS too_early,
              clock_timestamp() >= s.starts_at + interval '1 hour' AS too_late
         FROM bookings b
         JOIN sessions s ON s.id = b.session_id
         JOIN users u ON u.id = b.user_id
        WHERE b.code = $1
          FOR UPDATE OF b`,
      [code],
    );
    const b = rows[0];

    if (!b) throw notFound('No booking with that code', 'CODE_NOT_FOUND');
    if (b.status !== 'confirmed') throw conflict('That booking was cancelled', 'BOOKING_CANCELLED');
    if (b.checked_in_at) throw conflict(`Code already used — ${b.name} is already checked in`, 'CODE_ALREADY_USED');
    if (b.too_early) throw conflict('Too early — check-in opens when the session starts', 'CHECKIN_NOT_OPEN');
    if (b.too_late) throw conflict('This session has already ended', 'SESSION_ENDED');

    const { rows: updated } = await client.query(
      'UPDATE bookings SET checked_in_at = now() WHERE id = $1 RETURNING checked_in_at',
      [b.id],
    );

    return {
      bookingId: b.id,
      memberName: b.name,
      sessionStartsAt: b.starts_at,
      checkedInAt: updated[0].checked_in_at,
    };
  });
}
