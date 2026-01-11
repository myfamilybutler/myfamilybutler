CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.debug_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
