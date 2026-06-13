DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserInviteStatus') THEN
    CREATE TYPE "UserInviteStatus" AS ENUM ('pending', 'accepted', 'expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role "UserRole" NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status "UserInviteStatus" NOT NULL DEFAULT 'pending',
  token_hash TEXT
);

CREATE INDEX IF NOT EXISTS user_invites_status_invited_at_idx
  ON user_invites (status, invited_at DESC);

CREATE INDEX IF NOT EXISTS user_invites_email_status_idx
  ON user_invites (email, status);
