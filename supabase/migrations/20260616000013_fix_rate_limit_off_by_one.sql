-- Fix off-by-one in check_rate_limit so the limit is enforced at exactly
-- p_max_count requests, not after p_max_count + 1.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_ms INTEGER,
  p_max_count INTEGER,
  p_now TIMESTAMPTZ
)
RETURNS TABLE(allowed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start, expires_at)
  VALUES (p_key, 1, p_now, p_now + INTERVAL '2 minutes')
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start < p_now - (p_window_ms || ' milliseconds')::INTERVAL THEN 1
      WHEN public.rate_limits.count >= p_max_count THEN public.rate_limits.count
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < p_now - (p_window_ms || ' milliseconds')::INTERVAL THEN p_now
      ELSE public.rate_limits.window_start
    END,
    expires_at = p_now + INTERVAL '2 minutes'
  RETURNING count, window_start INTO v_count, v_window_start;

  IF v_window_start < p_now - (p_window_ms || ' milliseconds')::INTERVAL THEN
    RETURN QUERY SELECT TRUE;
  ELSIF v_count >= p_max_count THEN
    RETURN QUERY SELECT FALSE;
  ELSE
    RETURN QUERY SELECT TRUE;
  END IF;
END;
$$;
