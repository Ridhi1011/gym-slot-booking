import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate, idParams } from '../middleware/validate.js';
import { requireAuth, requireMember } from '../middleware/auth.js';
import { joinWaitlist, leaveWaitlist } from '../services/waitlist.js';

const router = Router();

// Both act on the caller's own entry only (user id comes from the token, never the request)
router.post('/sessions/:id/waitlist', requireAuth, requireMember, validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const entry = await joinWaitlist(req.valid.params.id, req.user.id);
    res.status(201).json({ waitlist: entry });
  }));

router.delete('/sessions/:id/waitlist', requireAuth, requireMember, validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    res.json(await leaveWaitlist(req.valid.params.id, req.user.id));
  }));

export default router;
