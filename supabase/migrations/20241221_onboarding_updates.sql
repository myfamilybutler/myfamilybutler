-- ===========================================
-- Onboarding Updates Migration
-- ===========================================
-- Adds columns for email linking and onboarding modal tracking

-- Add linked_email for desktop login (email magic links)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  linked_email TEXT UNIQUE DEFAULT NULL;

-- Add onboarding_modal_shown to track if user has seen dashboard modal
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  onboarding_modal_shown BOOLEAN DEFAULT FALSE;

-- Add onboarding_source to track how user first registered
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS 
  onboarding_source TEXT DEFAULT 'whatsapp' 
  CHECK (onboarding_source IN ('whatsapp', 'telegram', 'invite'));

-- Index for email lookup (for email magic link login)
CREATE INDEX IF NOT EXISTS idx_users_linked_email ON public.users(linked_email);

-- Add email tokens for email magic link login
CREATE TABLE IF NOT EXISTS email_login_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_email_login_tokens_hash ON email_login_tokens(token_hash);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_email_login_tokens_expires ON email_login_tokens(expires_at);

-- Enable RLS
ALTER TABLE email_login_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can manage email_login_tokens
CREATE POLICY "Service role can manage email_login_tokens"
  ON email_login_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE email_login_tokens IS 'Stores short-lived tokens for email magic link login';
