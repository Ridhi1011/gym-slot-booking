import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '../db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { conflict, unauthorized } from '../lib/errors.js';

const router = Router();

const email = z.string().trim().toLowerCase().pipe(z.email('must be a valid email'));

const registerBody = z.object({
  name: z.string().trim().min(2, 'must be at least 2 characters').max(80),
  email,
  password: z.string().min(8, 'must be at least 8 characters').max(72), // bcrypt ignores bytes past 72
});

const loginBody = z.object({
  email,
  password: z.string().min(1, 'is required'),
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

router.post('/register', validate({ body: registerBody }), asyncHandler(async (req, res) => {
  const { name, email, password } = req.valid.body;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Role is hardcoded: registration can never create an admin
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'member')
       RETURNING id, name, email, role`,
      [name, email, passwordHash],
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === '23505') throw conflict('An account with that email already exists', 'EMAIL_TAKEN');
    throw err;
  }
}));

router.post('/login', validate({ body: loginBody }), asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Same message for unknown email and wrong password so emails can't be probed
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw unauthorized('Wrong email or password', 'INVALID_CREDENTIALS');

  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw unauthorized('Account no longer exists', 'INVALID_TOKEN');
  res.json({ user: publicUser(rows[0]) });
}));

export default router;
