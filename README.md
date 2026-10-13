# MatSlot — Gym Slot Booking

Members book one-hour gym sessions (20 mats each), join a waitlist when a session is full, and get a
6-character check-in code. Admins create sessions, see who's booked and check members in at the door.
The server is the only authority: capacity, waitlist promotion and check-in rules are all enforced in the database layer.

**Live demo:** _frontend URL here_ · **API:** _backend URL here_

## Tech stack

- **Server:** Node.js (ES modules), Express, PostgreSQL via `pg` (raw SQL), bcrypt, JWT, zod
- **Client:** React + Vite, Tailwind CSS, react-router, lucide-react
- **Database:** PostgreSQL on Neon

## Setup

Requires Node 20+ and a Postgres database (a free [Neon](https://neon.tech) project works).

```bash
# 1. Server
cd server
cp .env.example .env        # set DATABASE_URL (Neon, keep sslmode=verify-full) and JWT_SECRET
npm install
npm run db:setup            # creates the tables (drops existing ones)
npm run db:migrate          # applies db/migrations/*.sql (safe to re-run; needed for older databases)
npm run seed                # demo data; safe to re-run
npm run dev                 # API on http://localhost:4000

# 2. Client (new terminal)
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # app on http://localhost:5173
```

`CLIENT_ORIGIN` in `server/.env` must match the client URL (CORS only allows that origin).

### Optional: Continue with Google

Email/password works without this. To add the Google button:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen,
   then **Create credentials → OAuth client ID → Web application**.
2. Under **Authorized JavaScript origins** add `http://localhost:5173` (and your deployed frontend URL).
   No redirect URI and no client secret are needed — this uses the Google Identity Services ID-token (popup) flow.
3. Put the client ID in both `server/.env` (`GOOGLE_CLIENT_ID`) and `client/.env` (`VITE_GOOGLE_CLIENT_ID`),
   run `npm run db:migrate` on an existing database, and restart both dev servers.

If `VITE_GOOGLE_CLIENT_ID` is empty the button is hidden; if `GOOGLE_CLIENT_ID` is empty `/api/auth/google` returns 503.

## Test credentials

| Role   | Email               | Password      | What to try |
|--------|---------------------|---------------|-------------|
| Admin  | admin@matslot.app   | `Admin@1234`  | Check in Asha with her code; create a session |
| Member | asha@matslot.app    | `Member@1234` | Has a booking in the **current hour** (live check-in demo) |
| Member | rahul@matslot.app   | `Member@1234` | #1 on the waitlist for tomorrow 07:00 (full session) |
| Member | meera@matslot.app   | `Member@1234` | #2 on the same waitlist; has a cancelled booking in history |

The seed also creates `member1@matslot.app` … `member22@matslot.app` (same password) to fill sessions.
Cancel one of their bookings for tomorrow 07:00 and watch Rahul get promoted (his page updates within 5 s).
The seed prints Asha's live check-in code at the end. Re-run `npm run seed` before a demo, since "current hour" moves.

## Design note

- **Stack:** Express + raw SQL keeps every query visible and explainable; React + Tailwind keeps the UI light.
- **Data model:** `users`, `sessions` (unique `starts_at`), `bookings` (status `confirmed`/`cancelled`, unique code), `waitlist` (unique per member per session).
- **Where the rules live:** in server-side transactions (`server/src/services/`). Every operation that changes a session's
  bookings or waitlist first runs `SELECT … FROM sessions WHERE id = $1 FOR UPDATE`, so concurrent requests for the same
  session queue up; the seat count is then re-read and trusted. Cancel and waitlist promotion happen in that same locked transaction.
- **Safety nets:** a partial unique index (one *confirmed* booking per member per session), `UNIQUE(session_id, user_id)` on the
  waitlist, a unique check-in code, and a CHECK that sessions start on the hour in gym time. Unique violations map to 409.
- **Client:** never decides anything — it shows optimistic seat counts on Book and rolls back if the server refuses.

## Race test

Proves a session never goes over capacity. With the API running:

```bash
cd server
npm run race-test           # or: API_URL=https://your-api npm run race-test
```

It creates a throwaway session with 19/20 seats taken and 25 temporary members, fires 25 booking requests at the same
time, then deletes everything it created. Expected output: exactly 1 success, 24 × `409 SESSION_FULL`, 20/20 in the DB.

## API

| Method | Path | Who | Notes |
|--------|------|-----|-------|
| POST | `/api/auth/register` | public | always creates a member |
| POST | `/api/auth/login` | public | returns `{ token, user }` |
| POST | `/api/auth/google` | public | `{ credential }` (Google ID token) → `{ token, user }` |
| GET | `/api/auth/me` | any | |
| GET | `/api/sessions?date=YYYY-MM-DD` | any | `seatsRemaining`, `myBooking`, `myWaitlistPosition` |
| POST | `/api/sessions` | admin | `{ date, hour }` in gym time |
| POST | `/api/sessions/:id/bookings` | member | |
| DELETE | `/api/bookings/:id` | owner | cancels and promotes from the waitlist |
| GET | `/api/me/bookings` | member | own bookings (with codes) and waitlist positions |
| POST / DELETE | `/api/sessions/:id/waitlist` | member | join / leave |
| GET | `/api/sessions/:id/bookings` | admin | roster + waitlist |
| POST | `/api/checkin` | admin | `{ code }` → member name |

Errors always look like `{ "error": { "code": "SESSION_FULL", "message": "…" } }`.

## Assumptions

- The gym runs on **Asia/Kolkata** time. Timestamps are stored in UTC (`timestamptz`); the admin's date + hour is
  interpreted in IST and all times are displayed in IST.
- A session has **started** when `now >= starts_at`. Booking, cancelling and joining the waitlist are only allowed before that.
- Check-in is valid from `starts_at` to `starts_at + 1 hour`, only for confirmed bookings, and only once.
- The waitlist is **FIFO** (by join time). Promotion is automatic on cancel; promoted members get a new code.
  A member can only join a waitlist when the session is full and they don't already hold a booking.
- Admins cannot book sessions; admins are only created by the seed script.
- **Google sign-in** is optional and members-only. The server verifies the ID token (signature, expiry, audience =
  our client ID) and requires `email_verified`. It matches users by Google account id first, then by email — an existing
  member with that email gets Google linked to their account (their password keeps working). Otherwise a new member
  is created with no password; trying password login on that account gives the usual "Wrong email or password".
  Google never creates or signs in an admin.
- Cancelled bookings are kept for history. A member can rebook after cancelling if seats remain.
- Sessions cannot be edited or deleted. Capacity is 20.
- JWTs expire after 7 days and are kept in `localStorage`.

## What I'd do next

- Automated API tests (node:test + a throwaway database) covering each rule, run in CI with the race test
- Rate limiting on login/register and check-in
- Email or push notification when a member is promoted from the waitlist
- Admin tools to edit/cancel sessions (notifying booked members) and change capacity
- httpOnly cookie auth instead of `localStorage`, with refresh tokens
- Recurring session templates (e.g. "weekdays 6–9 am")
