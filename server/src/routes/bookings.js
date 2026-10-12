import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idParams } from '../middleware/validate.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { bookSession, cancelBooking } from '../services/bookings.js';

const router = Router();

router.post('/sessions/:id/bookings', requireAuth, requireMember, validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const booking = await bookSession(req.valid.params.id, req.user.id);
    res.status(201).json({ booking });
  }));

// Ownership is checked inside cancelBooking (403 if it's someone else's)
router.delete('/bookings/:id', requireAuth, requireMember, validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const result = await cancelBooking(req.valid.params.id, req.user.id);
    res.json(result);
  }));

export default router;
