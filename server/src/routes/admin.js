import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idParams } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { notFound } from '../lib/errors.js';
import { CODE_PATTERN } from '../lib/codes.js';
import { checkInByCode } from '../services/checkin.js';

const router = Router();
const adminOnly = [requireAuth, requireAdmin];

// Accept "abc 123" style input from a human at the front desk
const checkinBody = z.object({
  code: z.string()
    .transform((s) => s.replace(/\s+/g, '').toUpperCase())
    .pipe(z.string().regex(CODE_PATTERN, 'must be 6 characters (letters and digits, no 0/O/1/I/L)')),
});

// Everyone booked into a session (including cancelled, for history) plus the waitlist
router.get('/sessions/:id/bookings', adminOnly, validate({ params: idParams }), asyncHandler(async (req, res) => {
  const sessionId = req.valid.params.id;

  const { rows: sessions } = await query(
    `SELECT id, starts_at, capacity FROM sessions WHERE id = $1`,
    [sessionId],
  );
  if (!sessions[0]) throw notFound('Session not found', 'SESSION_NOT_FOUND');

  const { rows: bookings } = await query(
    `SELECT b.id, b.status, b.checked_in_at, b.created_at, b.cancelled_at,
            u.id AS user_id, u.name, u.email
       FROM bookings b
       JOIN users u ON u.id = b.user_id
      WHERE b.session_id = $1
      ORDER BY (b.status = 'confirmed') DESC, u.name`,
    [sessionId],
  );

  const { rows: waitlist } = await query(
    `SELECT w.id, w.created_at, u.id AS user_id, u.name, u.email
       FROM waitlist w
       JOIN users u ON u.id = w.user_id
      WHERE w.session_id = $1
      ORDER BY w.created_at, w.id`,
    [sessionId],
  );

  const s = sessions[0];
  res.json({
    session: { id: s.id, startsAt: s.starts_at, capacity: s.capacity },
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      checkedInAt: b.checked_in_at,
      createdAt: b.created_at,
      cancelledAt: b.cancelled_at,
      member: { id: b.user_id, name: b.name, email: b.email },
    })),
    waitlist: waitlist.map((w, i) => ({
      id: w.id,
      position: i + 1,
      joinedAt: w.created_at,
      member: { id: w.user_id, name: w.name, email: w.email },
    })),
  });
}));

router.post('/checkin', adminOnly, validate({ body: checkinBody }), asyncHandler(async (req, res) => {
  res.json({ checkin: await checkInByCode(req.valid.body.code) });
}));

export default router;
