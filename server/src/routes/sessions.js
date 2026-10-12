import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { AppError, conflict } from '../lib/errors.js';
import { GYM_TZ, gymToday } from '../lib/time.js';

const router = Router();

// "YYYY-MM-DD" that is also a real calendar date (rejects 2026-02-31)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD').refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, 'is not a real date');

const listQuery = z.object({ date: isoDate.optional() });
const createBody = z.object({
  date: isoDate,
  hour: z.coerce.number().int().min(0, 'must be 0-23').max(23, 'must be 0-23'),
});

// Shapes a DB row into the API response
export function toSessionDto(row) {
  return {
    id: row.id,
    startsAt: row.starts_at,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    seatsRemaining: Math.max(row.capacity - row.booked_count, 0),
    waitlistCount: row.waitlist_count,
    hasStarted: row.has_started,
    myBooking: row.my_booking_id
      ? { id: row.my_booking_id, code: row.my_code, checkedInAt: row.my_checked_in_at }
      : null,
    myWaitlistPosition: row.my_position, // null when not on the waitlist
  };
}

// Sessions for one gym-local day, with counts and the caller's own booking/waitlist status.
// $1 = date, $2 = caller's user id
router.get('/', requireAuth, validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const date = req.valid.query.date ?? gymToday();
  const { rows } = await query(
    `SELECT s.id, s.starts_at, s.capacity,
            s.starts_at <= now() AS has_started,
            (SELECT count(*)::int FROM bookings b
              WHERE b.session_id = s.id AND b.status = 'confirmed') AS booked_count,
            (SELECT count(*)::int FROM waitlist w WHERE w.session_id = s.id) AS waitlist_count,
            mb.id AS my_booking_id, mb.code AS my_code, mb.checked_in_at AS my_checked_in_at,
            -- position = how many entries joined at or before mine (FIFO)
            CASE WHEN mw.id IS NULL THEN NULL ELSE
              (SELECT count(*)::int FROM waitlist w2
                WHERE w2.session_id = s.id AND (w2.created_at, w2.id) <= (mw.created_at, mw.id))
            END AS my_position
       FROM sessions s
       LEFT JOIN bookings mb ON mb.session_id = s.id AND mb.user_id = $2 AND mb.status = 'confirmed'
       LEFT JOIN waitlist mw ON mw.session_id = s.id AND mw.user_id = $2
      WHERE (s.starts_at AT TIME ZONE '${GYM_TZ}')::date = $1
      ORDER BY s.starts_at`,
    [date, req.user.id],
  );
  res.json({ date, sessions: rows.map(toSessionDto) });
}));

// Admin creates a session from a gym-local date + hour. Postgres does the
// local -> UTC conversion so Node's own timezone never matters.
router.post('/', requireAuth, requireAdmin, validate({ body: createBody }), asyncHandler(async (req, res) => {
  const { date, hour } = req.valid.body;
  try {
    const { rows } = await query(
      `WITH t AS (
         SELECT ($1::date + make_interval(hours => $2)) AT TIME ZONE '${GYM_TZ}' AS starts_at
       )
       INSERT INTO sessions (starts_at)
       SELECT starts_at FROM t WHERE starts_at > now()
       RETURNING id, starts_at, capacity`,
      [date, hour],
    );
    // Nothing inserted means the WHERE filtered it out: the time is in the past
    if (!rows[0]) throw new AppError(422, 'SESSION_IN_PAST', 'Cannot create a session that has already started');

    const s = rows[0];
    res.status(201).json({
      session: toSessionDto({ ...s, booked_count: 0, waitlist_count: 0, has_started: false, my_position: null }),
    });
  } catch (err) {
    if (err.code === '23505') throw conflict('A session already exists at that time', 'DUPLICATE_SESSION');
    throw err;
  }
}));

export default router;
