-- ===========================================
-- Magic Tokens Table for Dashboard Access
-- ===========================================
-- Run this in Supabase SQL Editor to create the magic_tokens table

CREATE TABLE IF NOT EXISTS magic_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'telegram')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_magic_tokens_hash ON magic_tokens(token_hash);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires ON magic_tokens(expires_at);

-- Enable RLS
ALTER TABLE magic_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow server-side access (no client access needed)
-- Tokens are created and consumed by server only

-- Auto-cleanup: Delete expired tokens older than 1 day
-- Run this as a scheduled job or cron if desired:
-- DELETE FROM magic_tokens WHERE expires_at < NOW() - INTERVAL '1 day';

COMMENT ON TABLE magic_tokens IS 'Stores short-lived tokens for passwordless dashboard access from WhatsApp/Telegram';
