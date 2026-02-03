-- Migration: Add atomic rate limiting function
-- This function provides race-condition-free rate limiting

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_ms INTEGER,
  p_max_count INTEGER,
  p_now TIMESTAMPTZ
)
RETURNS TABLE(allowed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Try to get or create the rate limit record
  INSERT INTO rate_limits (key, count, window_start, expires_at)
  VALUES (p_key, 1, p_now, p_now + INTERVAL '2 minutes')
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start < p_now - (p_window_ms || ' milliseconds')::INTERVAL THEN 1
      WHEN rate_limits.count >= p_max_count THEN rate_limits.count
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < p_now - (p_window_ms || ' milliseconds')::INTERVAL THEN p_now
      ELSE rate_limits.window_start
    END,
    expires_at = p_now + INTERVAL '2 minutes'
  WHERE rate_limits.key = p_key
  RETURNING count, window_start INTO v_count, v_window_start;

  -- Check if request is allowed
  IF v_window_start < p_now - (p_window_ms || ' milliseconds')::INTERVAL THEN
    -- Window expired, reset and allow
    RETURN QUERY SELECT TRUE;
  ELSIF v_count > p_max_count THEN
    -- Limit exceeded
    RETURN QUERY SELECT FALSE;
  ELSE
    -- Within limit
    RETURN QUERY SELECT TRUE;
  END IF;
END;
$$;

-- Add comment
COMMENT ON FUNCTION check_rate_limit IS 'Atomic rate limiting function that prevents race conditions';
