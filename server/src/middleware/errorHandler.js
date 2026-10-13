import { AppError } from '../lib/errors.js';

// Unique-constraint name -> friendly 409. The DB is the last line of defence,
// so if a duplicate slips past the app checks the client still gets a clear error.
const UNIQUE_VIOLATIONS = {
  users_email_key: ['EMAIL_TAKEN', 'An account with that email already exists'],
  users_google_sub_key: ['GOOGLE_ACCOUNT_LINKED', 'That Google account is already linked to another user'],
  sessions_starts_at_key: ['DUPLICATE_SESSION', 'A session already exists at that time'],
  bookings_one_active_per_member: ['ALREADY_BOOKED', 'You already have a booking for this session'],
  waitlist_session_id_user_id_key: ['ALREADY_WAITLISTED', 'You are already on the waitlist for this session'],
};

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// Last middleware in the chain. Never leaks stack traces to the client.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }

  // Postgres unique violation
  if (err.code === '23505') {
    const [code, message] = UNIQUE_VIOLATIONS[err.constraint] ?? ['DUPLICATE', 'That already exists'];
    return res.status(409).json({ error: { code, message } });
  }

  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
