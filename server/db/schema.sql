-- MatSlot schema. Safe to re-run: drops and recreates everything.

DROP TABLE IF EXISTS waitlist;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,           -- stored lowercased by the app
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         SERIAL PRIMARY KEY,
  starts_at  TIMESTAMPTZ NOT NULL UNIQUE,       -- stored in UTC
  capacity   INT NOT NULL DEFAULT 20 CHECK (capacity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Must start on the hour in gym time. India is UTC+5:30, so "on the hour in UTC" isn't enough.
  CONSTRAINT sessions_on_the_hour CHECK (
    date_part('minute', starts_at AT TIME ZONE 'Asia/Kolkata') = 0
    AND date_part('second', starts_at AT TIME ZONE 'Asia/Kolkata') = 0
  )
);

CREATE TABLE bookings (
  id            SERIAL PRIMARY KEY,
  session_id    INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  code          CHAR(6) NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at  TIMESTAMPTZ
);

-- Second safety net: one active booking per member per session.
-- Cancelled rows are kept for history, so this has to be partial.
CREATE UNIQUE INDEX bookings_one_active_per_member
  ON bookings (session_id, user_id) WHERE status = 'confirmed';

CREATE INDEX bookings_user_idx ON bookings (user_id);

CREATE TABLE waitlist (
  id         SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- FIFO lookups when promoting
CREATE INDEX waitlist_session_order_idx ON waitlist (session_id, created_at, id);
