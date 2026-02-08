-- ===========================================
-- Draft Bundles for Multi-Event Confirmation
-- ===========================================

CREATE TABLE IF NOT EXISTS public.draft_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired')),
  reason TEXT NOT NULL,
  confidence DECIMAL(3,2),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draft_bundles_household ON public.draft_bundles(household_id);
CREATE INDEX IF NOT EXISTS idx_draft_bundles_status ON public.draft_bundles(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_draft_bundles_expires ON public.draft_bundles(expires_at);

ALTER TABLE public.draft_events
  ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES public.draft_bundles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_draft_events_bundle ON public.draft_events(bundle_id);

ALTER TABLE public.draft_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage draft_bundles" ON public.draft_bundles;
CREATE POLICY "Service role can manage draft_bundles"
  ON public.draft_bundles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE public.draft_bundles
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  UPDATE public.draft_events
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();

  DELETE FROM public.draft_events
  WHERE status = 'expired' AND expires_at < (NOW() - INTERVAL '7 days');

  DELETE FROM public.draft_bundles
  WHERE status = 'expired' AND expires_at < (NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.draft_bundles IS 'Bundle of temporary draft events awaiting user confirmation.';
