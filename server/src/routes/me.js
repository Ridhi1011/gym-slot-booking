import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireMember } from '../middleware/auth.js';

const router = Router();

// The caller's own bookings and waitlist entries only (filtered by req.user.id).
router.get('/bookings', requireAuth, requireMember, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Upcoming/ongoing first (soonest first), then finished or cancelled ones (latest first)
  const { rows: bookings } = await query(
    `SELECT b.id, b.session_id, b.status, b.code, b.checked_in_at, b.created_at, b.cancelled_at,
            s.starts_at,
            s.starts_at <= now() AS has_started,
            s.starts_at + interval '1 hour' <= now() AS has_ended,
            (b.status = 'confirmed' AND s.starts_at + interval '1 hour' > now()) AS is_upcoming
       FROM bookings b
       JOIN sessions s ON s.id = b.session_id
      WHERE b.user_id = $1
      ORDER BY is_upcoming DESC,
               CASE WHEN b.status = 'confirmed' AND s.starts_at + interval '1 hour' > now()
                    THEN s.starts_at END ASC,
               s.starts_at DESC
      LIMIT 50`,
    [userId],
  );

  const { rows: waitlist } = await query(
    `SELECT w.id, w.session_id, w.created_at, s.starts_at,
            s.starts_at <= now() AS has_started,
            (SELECT count(*)::int FROM waitlist w2
              WHERE w2.session_id = w.session_id AND (w2.created_at, w2.id) <= (w.created_at, w.id)) AS position
       FROM waitlist w
       JOIN sessions s ON s.id = w.session_id
      WHERE w.user_id = $1 AND s.starts_at > now()
      ORDER BY s.starts_at`,
    [userId],
  );

  res.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      sessionId: b.session_id,
      status: b.status,
      code: b.code,
      checkedInAt: b.checked_in_at,
      createdAt: b.created_at,
      cancelledAt: b.cancelled_at,
      startsAt: b.starts_at,
      hasStarted: b.has_started,
      hasEnded: b.has_ended,
      isUpcoming: b.is_upcoming,
    })),
    waitlist: waitlist.map((w) => ({
      id: w.id,
      sessionId: w.session_id,
      startsAt: w.starts_at,
      joinedAt: w.created_at,
      position: w.position,
    })),
  });
}));

export default router;
