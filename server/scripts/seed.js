// Demo data. Idempotent: wipes every table, then inserts a fresh set.
//   npm run seed
import bcrypt from 'bcrypt';
import { pool, withTransaction } from '../src/db.js';
import { generateCode } from '../src/lib/codes.js';
import { GYM_TZ } from '../src/lib/time.js';

const ADMIN = { name: 'Gym Admin', email: 'admin@matslot.app', password: 'Admin@1234' };
const MEMBER_PASSWORD = 'Member@1234';
const NAMED = [
  { key: 'asha', name: 'Asha Verma', email: 'asha@matslot.app' },
  { key: 'rahul', name: 'Rahul Mehta', email: 'rahul@matslot.app' },
  { key: 'meera', name: 'Meera Iyer', email: 'meera@matslot.app' },
];
const EXTRA_MEMBERS = 22; // enough to fill one session completely
const DAILY_HOURS = [6, 7, 8, 9, 17, 18, 19, 20];
const DAYS_AHEAD = 4; // today + next 3 days

await withTransaction(async (db) => {
  await db.query('TRUNCATE waitlist, bookings, sessions, users RESTART IDENTITY CASCADE');

  // --- users ---------------------------------------------------------------
  const adminHash = await bcrypt.hash(ADMIN.password, 10);
  const memberHash = await bcrypt.hash(MEMBER_PASSWORD, 10);

  await db.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
    [ADMIN.name, ADMIN.email, adminHash],
  );

  const users = {};
  for (const m of NAMED) {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [m.name, m.email, memberHash],
    );
    users[m.key] = rows[0].id;
  }

  const { rows: extras } = await db.query(
    `INSERT INTO users (name, email, password_hash)
     SELECT 'Member ' || lpad(i::text, 2, '0'), 'member' || i || '@matslot.app', $1
       FROM generate_series(1, $2::int) AS i
     RETURNING id`,
    [memberHash, EXTRA_MEMBERS],
  );
  const extraIds = extras.map((r) => r.id);

  // --- sessions ------------------------------------------------------------
  // Regular timetable for the next few days (gym-local hours), future slots only
  await db.query(
    `INSERT INTO sessions (starts_at)
     SELECT ((now() AT TIME ZONE '${GYM_TZ}')::date + d + make_interval(hours => h)) AT TIME ZONE '${GYM_TZ}'
       FROM generate_series(0, $1::int - 1) AS d, unnest($2::int[]) AS h
      WHERE ((now() AT TIME ZONE '${GYM_TZ}')::date + d + make_interval(hours => h)) AT TIME ZONE '${GYM_TZ}' > now()`,
    [DAYS_AHEAD, DAILY_HOURS],
  );

  // Current gym-local hour (live check-in demo) and one 3 hours earlier (history).
  // date_trunc needs the zone: India is UTC+5:30, so truncating in UTC lands on :30.
  const { rows: [{ id: live }] } = await db.query(
    `INSERT INTO sessions (starts_at) VALUES (date_trunc('hour', now(), '${GYM_TZ}')) RETURNING id`,
  );
  const { rows: [{ id: past }] } = await db.query(
    `INSERT INTO sessions (starts_at) VALUES (date_trunc('hour', now(), '${GYM_TZ}') - interval '3 hours') RETURNING id`,
  );

  // Session id for "tomorrow at <hour>" (gym-local)
  async function tomorrowAt(hour, dayOffset = 1) {
    const { rows } = await db.query(
      `SELECT id FROM sessions
        WHERE starts_at = ((now() AT TIME ZONE '${GYM_TZ}')::date + $1::int + make_interval(hours => $2))
                          AT TIME ZONE '${GYM_TZ}'`,
      [dayOffset, hour],
    );
    return rows[0].id;
  }

  // --- bookings ------------------------------------------------------------
  const usedCodes = new Set();
  function freshCode() {
    let code;
    do code = generateCode(); while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  }

  async function book(sessionId, userId, extra = {}) {
    await db.query(
      `INSERT INTO bookings (session_id, user_id, status, code, checked_in_at, cancelled_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, userId, extra.status ?? 'confirmed', freshCode(), extra.checkedInAt ?? null,
        extra.status === 'cancelled' ? new Date() : null],
    );
  }

  const fullSession = await tomorrowAt(7);
  const almostFull = await tomorrowAt(18);

  // Full: 20 extra members, Rahul then Meera waiting (in that order)
  for (const id of extraIds.slice(0, 20)) await book(fullSession, id);
  await db.query(
    `INSERT INTO waitlist (session_id, user_id, created_at) VALUES
       ($1, $2, now() - interval '10 minutes'),
       ($1, $3, now() - interval '5 minutes')`,
    [fullSession, users.rahul, users.meera],
  );

  // Almost full: 2 mats left
  for (const id of extraIds.slice(0, 18)) await book(almostFull, id);

  // Live session: Asha booked (not yet checked in), a couple of others, one already in
  await book(live, users.asha);
  await book(live, extraIds[20], { checkedInAt: new Date() });
  await book(live, extraIds[21]);

  // Past session: Asha attended
  await book(past, users.asha, { checkedInAt: new Date(Date.now() - 3 * 3600_000) });

  // Some upcoming bookings for the named members
  await book(await tomorrowAt(8), users.asha);
  await book(await tomorrowAt(18, 2), users.asha);
  await book(await tomorrowAt(17), users.rahul);
  await book(await tomorrowAt(8), users.meera, { status: 'cancelled' }); // shows in history
});

// --- summary ---------------------------------------------------------------
const { rows: summary } = await pool.query(
  `SELECT to_char(s.starts_at AT TIME ZONE '${GYM_TZ}', 'Dy DD Mon HH24:MI') AS starts_ist,
          count(b.id) FILTER (WHERE b.status = 'confirmed')::int AS booked,
          s.capacity,
          (SELECT count(*)::int FROM waitlist w WHERE w.session_id = s.id) AS waitlist
     FROM sessions s
     LEFT JOIN bookings b ON b.session_id = s.id
    GROUP BY s.id
   HAVING count(b.id) > 0
    ORDER BY s.starts_at`,
);
const { rows: [{ n: sessionCount }] } = await pool.query('SELECT count(*)::int AS n FROM sessions');
const { rows: [asha] } = await pool.query(
  `SELECT b.code FROM bookings b JOIN users u ON u.id = b.user_id JOIN sessions s ON s.id = b.session_id
    WHERE u.email = 'asha@matslot.app' AND s.starts_at = date_trunc('hour', now(), '${GYM_TZ}')`,
);

console.log(`Seeded ${sessionCount} sessions (${GYM_TZ}). Sessions with bookings:`);
console.table(summary);
console.log('\nLogins');
console.table([
  { role: 'admin', email: ADMIN.email, password: ADMIN.password },
  ...NAMED.map((m) => ({ role: 'member', email: m.email, password: MEMBER_PASSWORD })),
]);
console.log(`\nLive check-in demo: Asha's code for the current hour is ${asha.code}`);

await pool.end();
