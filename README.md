# MatSlot - Gym Slot Booking

Booking system for a gym that runs one-hour sessions with 20 mats each. Members book or cancel online, join a waitlist if a session is full, and get a short code to show at the door. Admins create sessions, see who's booked and check people in.

Live app: https://gym-slot-booking-eight.vercel.app
API: https://gym-slot-booking-7nc0.onrender.com

## Stack

- Backend: Node.js, Express, PostgreSQL (plain SQL with `pg`), bcrypt, JWT, zod
- Frontend: React (Vite), Tailwind CSS, react-router, lucide-react
- Database: Postgres hosted on Neon

## Running it locally

You need Node 20+ and a Postgres database. I used a free Neon project.

Backend:

```bash
cd server
cp .env.example .env     # fill in DATABASE_URL and JWT_SECRET
npm install
npm run db:setup         # creates tables (drops old ones)
npm run db:migrate       # applies migrations, safe to run again
npm run seed             # demo data, safe to run again
npm run dev              # http://localhost:4000
```

Frontend (in another terminal):

```bash
cd client
cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm install
npm run dev              # http://localhost:5173
```

`CLIENT_ORIGIN` in `server/.env` has to match the frontend URL, otherwise CORS will block requests.

For the live check-in demo to work, run `npm run seed` again just before testing. It always creates a session in the current hour and prints a fresh check-in code.

### Google sign-in (optional)

Email/password login works without this. If you want the Google button:

1. Create an OAuth client ID (type: Web application) in Google Cloud Console.
2. Add `http://localhost:5173` under Authorized JavaScript origins. No redirect URI or client secret needed, it uses the popup flow.
3. Put the client ID in `server/.env` as `GOOGLE_CLIENT_ID` and in `client/.env` as `VITE_GOOGLE_CLIENT_ID`, then restart both.

If the client ID is missing, the button just doesn't show.

## Test logins

| Role   | Email             | Password    | Notes |
|--------|-------------------|-------------|-------|
| Admin  | admin@matslot.app | Admin@1234  | create sessions, check people in |
| Member | asha@matslot.app  | Member@1234 | has a booking in the current hour (use her code for check-in) |
| Member | rahul@matslot.app | Member@1234 | #1 on the waitlist for tomorrow 07:00 (full) |
| Member | meera@matslot.app | Member@1234 | #2 on the same waitlist |

There are also `member1` to `member22@matslot.app` (same password) used to fill up sessions. To see the waitlist working, log in as one of them, cancel their booking for tomorrow 07:00, and Rahul's page should show him booked within about 5 seconds.


## Race test

I wrote a small script to check the capacity limit actually holds. With the API running:

```bash
cd server
npm run race-test
```

It makes a test session with 19 of 20 mats taken, sends 25 booking requests at the same time, and checks the result. You should see 1 success, 24 rejected with `SESSION_FULL`, and 20/20 in the database. It cleans up after itself.

## API

| Method | Route | Who | |
|--------|-------|-----|---|
| POST | /api/auth/register | anyone | creates a member |
| POST | /api/auth/login | anyone | returns token + user |
| POST | /api/auth/google | anyone | Google sign-in |
| GET | /api/auth/me | logged in | |
| GET | /api/sessions?date=YYYY-MM-DD | logged in | includes seats left, your booking and waitlist position |
| POST | /api/sessions | admin | `{ date, hour }` |
| POST | /api/sessions/:id/bookings | member | book |
| DELETE | /api/bookings/:id | owner | cancel (promotes next on waitlist) |
| GET | /api/me/bookings | member | your bookings and waitlist spots |
| POST / DELETE | /api/sessions/:id/waitlist | member | join / leave |
| GET | /api/sessions/:id/bookings | admin | who's booked + waitlist |
| POST | /api/checkin | admin | `{ code }`, returns member name |

Every error comes back in the same shape: `{ "error": { "code": "SESSION_FULL", "message": "..." } }`


