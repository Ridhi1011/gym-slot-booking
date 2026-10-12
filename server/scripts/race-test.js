// Fires 25 simultaneous booking requests (each from a different member) at a
// session that has exactly 1 seat left. Exactly 1 should succeed.
//
// Needs the API running (npm run dev). Uses its own throwaway session and users,
// and deletes them at the end, so it won't touch seeded data.
//
//   npm run race-test            (API at http://localhost:$PORT)
//   API_URL=https://... npm run race-test
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { signToken } from '../src/middleware/auth.js';
import { generateCode } from '../src/lib/codes.js';

const API_URL = process.env.API_URL || `http://localhost:${config.port}`;
const RACERS = 25;
const TAG = `race-${Date.now()}`;

async function setup() {
  // Far-future slot at a random hour so repeated runs never clash with real sessions
  const { rows: [session] } = await pool.query(
    `INSERT INTO sessions (starts_at)
     VALUES (date_trunc('hour', now()) + interval '400 days' + make_interval(hours => $1))
     RETURNING id, capacity`,
    [Math.floor(Math.random() * 5000)],
  );

  // capacity - 1 filler members + RACERS racing members.
  // Password hash is a dummy: these accounts can never log in.
  const total = session.capacity - 1 + RACERS;
  const { rows: users } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     SELECT 'Race ' || i, $1 || '-' || i || '@race.test', '!', 'member'
       FROM generate_series(1, $2::int) AS i
     RETURNING id, name, role`,
    [TAG, total],
  );

  const fillers = users.slice(0, session.capacity - 1);
  const racers = users.slice(session.capacity - 1);
  for (const u of fillers) {
    await pool.query(
      `INSERT INTO bookings (session_id, user_id, status, code) VALUES ($1, $2, 'confirmed', $3)`,
      [session.id, u.id, generateCode()],
    );
  }
  return { session, racers };
}

async function cleanup(sessionId) {
  // ON DELETE CASCADE removes their bookings and waitlist rows too
  if (sessionId) await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`${TAG}-%`]);
}

let sessionId;
try {
  const health = await fetch(`${API_URL}/api/health`).catch(() => null);
  if (!health?.ok) throw new Error(`API not reachable at ${API_URL} — start it with "npm run dev" first`);

  const { session, racers } = await setup();
  sessionId = session.id;
  console.log(`Session ${session.id}: ${session.capacity - 1}/${session.capacity} booked, 1 seat left`);
  console.log(`Firing ${racers.length} booking requests at the same time...\n`);

  // Build every request first, then release them together
  const results = await Promise.all(racers.map(async (user) => {
    const res = await fetch(`${API_URL}/api/sessions/${session.id}/bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${signToken(user)}` },
    });
    const body = await res.json();
    return { status: res.status, code: body.error?.code ?? 'BOOKED' };
  }));

  const tally = {};
  for (const r of results) {
    const key = `${r.status} ${r.code}`;
    tally[key] = (tally[key] ?? 0) + 1;
  }
  console.table(tally);

  const succeeded = results.filter((r) => r.status === 201).length;
  const { rows: [{ n }] } = await pool.query(
    `SELECT count(*)::int AS n FROM bookings WHERE session_id = $1 AND status = 'confirmed'`,
    [session.id],
  );

  console.log(`\nSucceeded: ${succeeded} (expected 1)`);
  console.log(`Confirmed bookings in DB: ${n} / ${session.capacity}`);

  const passed = succeeded === 1 && n === session.capacity;
  console.log(passed ? '\nPASS: no overbooking' : '\nFAIL');
  process.exitCode = passed ? 0 : 1;
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await cleanup(sessionId);
  await pool.end();
}
