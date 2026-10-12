import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized, forbidden } from '../lib/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, config.jwtSecret, { expiresIn: '7d' });
}

// Expects "Authorization: Bearer <token>". Sets req.user = { id, role, name }.
export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub), role: payload.role, name: payload.name };
    next();
  } catch {
    next(unauthorized('Your session has expired, please log in again', 'INVALID_TOKEN'));
  }
}

// Use after requireAuth
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return next(forbidden(role === 'admin' ? 'Admins only' : 'Members only'));
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireMember = requireRole('member');
