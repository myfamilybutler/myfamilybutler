-- Migration: Distributed lock for Google sync across instances

CREATE TABLE IF NOT EXISTS public.sync_locks (
  lock_key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_locks_expires_at ON public.sync_locks(expires_at);

CREATE OR REPLACE FUNCTION public.try_acquire_sync_lock(
  p_lock_key TEXT,
  p_owner_id TEXT,
  p_ttl_seconds INTEGER DEFAULT 120
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.sync_locks (lock_key, owner_id, acquired_at, expires_at)
  VALUES (
    p_lock_key,
    p_owner_id,
    v_now,
    v_now + make_interval(secs => p_ttl_seconds)
  )
  ON CONFLICT (lock_key)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    acquired_at = EXCLUDED.acquired_at,
    expires_at = EXCLUDED.expires_at
  WHERE public.sync_locks.expires_at < v_now;

  RETURN EXISTS (
    SELECT 1
    FROM public.sync_locks
    WHERE lock_key = p_lock_key
      AND owner_id = p_owner_id
      AND expires_at > v_now
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_sync_lock(
  p_lock_key TEXT,
  p_owner_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sync_locks
  WHERE lock_key = p_lock_key
    AND owner_id = p_owner_id;

  RETURN FOUND;
END;
$$;
