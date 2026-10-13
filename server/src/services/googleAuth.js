import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { withTransaction } from '../db.js';
import { AppError, conflict, forbidden, unauthorized } from '../lib/errors.js';

const googleClient = new OAuth2Client();

// Checks the ID token from the Google button: signature (Google's public keys),
// expiry, issuer, and that it was issued for OUR client id (audience).
export async function verifyGoogleCredential(credential) {
  if (!config.googleClientId) {
    throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not set up on this server');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('Google sign-in failed, please try again', 'INVALID_GOOGLE_TOKEN');
  }

  if (!payload?.sub || !payload.email) {
    throw unauthorized('Google sign-in failed, please try again', 'INVALID_GOOGLE_TOKEN');
  }
  // Without this, anyone could claim an unverified address and take over a matching account
  if (payload.email_verified !== true) {
    throw unauthorized('Your Google email address is not verified', 'GOOGLE_EMAIL_UNVERIFIED');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: (payload.name || payload.email.split('@')[0]).trim().slice(0, 80),
  };
}

// Google account -> MatSlot user. Never creates or upgrades to admin.
// 1. Seen this Google account before -> that user
// 2. A member already uses this email -> link the Google account to them
// 3. Otherwise -> new member with no password
export function findOrCreateGoogleUser({ sub, email, name }) {
  return withTransaction(async (client) => {
    const bySub = await client.query('SELECT * FROM users WHERE google_sub = $1', [sub]);
    if (bySub.rows[0]) return assertMember(bySub.rows[0]);

    // FOR UPDATE so two first-time Google logins for the same email can't both link
    const byEmail = await client.query('SELECT * FROM users WHERE email = $1 FOR UPDATE', [email]);
    const existing = byEmail.rows[0];
    if (existing) {
      assertMember(existing);
      if (existing.google_sub && existing.google_sub !== sub) {
        throw conflict('This email is already linked to a different Google account', 'GOOGLE_ACCOUNT_MISMATCH');
      }
      const { rows } = await client.query(
        'UPDATE users SET google_sub = $1 WHERE id = $2 RETURNING *',
        [sub, existing.id],
      );
      return rows[0];
    }

    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role, google_sub)
       VALUES ($1, $2, NULL, 'member', $3)
       RETURNING *`,
      [name, email, sub],
    );
    return rows[0];
  });
}

// Admin accounts only ever sign in with email + password
function assertMember(user) {
  if (user.role !== 'member') {
    throw forbidden('Admin accounts must sign in with email and password', 'GOOGLE_ADMIN_NOT_ALLOWED');
  }
  return user;
}
