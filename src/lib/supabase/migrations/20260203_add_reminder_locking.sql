-- Migration: Add reminder locking function
-- Prevents duplicate reminder sends with row-level locking

CREATE OR REPLACE FUNCTION get_and_lock_due_reminders(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  message TEXT,
  remind_at TIMESTAMPTZ,
  status TEXT,
  users JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH locked_reminders AS (
    SELECT r.id, r.user_id, r.message, r.remind_at, r.status
    FROM reminders r
    WHERE r.status = 'pending'
      AND r.remind_at <= NOW()
    ORDER BY r.remind_at ASC
    LIMIT limit_count
    FOR UPDATE SKIP LOCKED
  )
  SELECT 
    lr.id,
    lr.user_id,
    lr.message,
    lr.remind_at,
    lr.status,
    to_jsonb(u.*) as users
  FROM locked_reminders lr
  JOIN users u ON u.id = lr.user_id;
END;
$$;

COMMENT ON FUNCTION get_and_lock_due_reminders IS 
'Atomically fetches and locks pending reminders to prevent duplicate processing.
Uses SKIP LOCKED to skip reminders already being processed by another worker.';

-- Add index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_reminders_status_remind_at 
  ON reminders(status, remind_at) 
  WHERE status = 'pending';
