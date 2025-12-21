-- ===========================================
-- OAuth Token Storage Table
-- Secure, RLS-protected storage for user OAuth tokens
-- ===========================================

-- Create the table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at BIGINT NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one token per user per provider
  UNIQUE(user_id, provider)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_id 
ON public.user_oauth_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_provider 
ON public.user_oauth_tokens(provider);

-- Enable RLS
ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service_role can access (no client access)
-- This ensures tokens are only accessible server-side
CREATE POLICY "Service role only access" ON public.user_oauth_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_oauth_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_oauth_tokens_timestamp ON public.user_oauth_tokens;
CREATE TRIGGER update_user_oauth_tokens_timestamp
  BEFORE UPDATE ON public.user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_token_timestamp();

-- Add comment
COMMENT ON TABLE public.user_oauth_tokens IS 'Stores OAuth tokens for external services like Google Calendar. Protected by RLS - service_role only.';
