-- Optional Google sign-in. Safe to run more than once.

-- Google's stable account id ("sub" claim). NULL for email/password-only users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_sub_key') THEN
    ALTER TABLE users ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);
  END IF;
END $$;

-- Google-only users have no password
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
