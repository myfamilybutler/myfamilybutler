-- Migration: Fix reminder claiming races + pending invite uniqueness

-- Ensure gen_random_uuid() exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Reminder claim metadata
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS claim_worker_id TEXT;

CREATE INDEX IF NOT EXISTS idx_reminders_claimable
  ON public.reminders(status, remind_at, claimed_at)
  WHERE status = 'pending';

-- 2) Atomic claim of due reminders
CREATE OR REPLACE FUNCTION public.claim_due_reminders(
  p_worker_id TEXT,
  p_limit_count INTEGER DEFAULT 100,
  p_claim_ttl_seconds INTEGER DEFAULT 600
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  message TEXT,
  remind_at TIMESTAMPTZ,
  status TEXT,
  claim_token UUID,
  users JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT r.id
    FROM public.reminders r
    WHERE r.status = 'pending'
      AND r.remind_at <= NOW()
      AND (
        r.claimed_at IS NULL
        OR r.claimed_at < NOW() - make_interval(secs => p_claim_ttl_seconds)
      )
    ORDER BY r.remind_at ASC
    LIMIT p_limit_count
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.reminders r
    SET
      claimed_at = NOW(),
      claim_token = gen_random_uuid(),
      claim_worker_id = p_worker_id
    FROM picked
    WHERE r.id = picked.id
    RETURNING r.id, r.user_id, r.message, r.remind_at, r.status, r.claim_token
  )
  SELECT
    c.id,
    c.user_id,
    c.message,
    c.remind_at,
    c.status,
    c.claim_token,
    to_jsonb(u.*) AS users
  FROM claimed c
  JOIN public.users u ON u.id = c.user_id;
END;
$$;

COMMENT ON FUNCTION public.claim_due_reminders IS
'Atomically claims due reminders by setting claim metadata and returning claimed rows.';

-- 3) Atomic claim of one reminder by id
CREATE OR REPLACE FUNCTION public.claim_single_reminder(
  p_reminder_id UUID,
  p_worker_id TEXT,
  p_claim_ttl_seconds INTEGER DEFAULT 600
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  message TEXT,
  remind_at TIMESTAMPTZ,
  status TEXT,
  claim_token UUID,
  users JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE public.reminders r
    SET
      claimed_at = NOW(),
      claim_token = gen_random_uuid(),
      claim_worker_id = p_worker_id
    WHERE r.id = p_reminder_id
      AND r.status = 'pending'
      AND (
        r.claimed_at IS NULL
        OR r.claimed_at < NOW() - make_interval(secs => p_claim_ttl_seconds)
      )
    RETURNING r.id, r.user_id, r.message, r.remind_at, r.status, r.claim_token
  )
  SELECT
    c.id,
    c.user_id,
    c.message,
    c.remind_at,
    c.status,
    c.claim_token,
    to_jsonb(u.*) AS users
  FROM claimed c
  JOIN public.users u ON u.id = c.user_id;
END;
$$;

COMMENT ON FUNCTION public.claim_single_reminder IS
'Atomically claims a single reminder by id for one worker.';

-- 4) Uniqueness guards for pending invites
CREATE UNIQUE INDEX IF NOT EXISTS idx_household_pending_phone_invite
  ON public.household_invites(household_id, phone_number)
  WHERE status = 'pending' AND phone_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_pending_email_invite
  ON public.household_invites(household_id, lower(email))
  WHERE status = 'pending' AND email IS NOT NULL;
