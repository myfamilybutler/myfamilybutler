-- ===========================================
-- Onboarding Updates Migration
-- ===========================================
-- Run this in Supabase SQL Editor after reviewing the inspection results
-- This adds columns and table needed for the new onboarding flow

-- =========================================
-- 1. Add columns to users table
-- =========================================

-- Add linked_email for desktop login via email magic link
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS linked_email TEXT UNIQUE DEFAULT NULL;

-- Add onboarding_modal_shown to track if user has seen dashboard modal
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_modal_shown BOOLEAN DEFAULT FALSE;

-- Add onboarding_source to track how user first registered
-- Note: If column already exists without constraint, this will fail gracefully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_source'
    ) THEN
        ALTER TABLE public.users ADD COLUMN onboarding_source TEXT DEFAULT 'whatsapp';
    END IF;
END $$;

-- Add check constraint for onboarding_source (if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'users_onboarding_source_check'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_onboarding_source_check 
        CHECK (onboarding_source IN ('whatsapp', 'telegram', 'invite', 'web'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =========================================
-- 2. Create index for email lookup
-- =========================================
CREATE INDEX IF NOT EXISTS idx_users_linked_email ON public.users(linked_email);

-- =========================================
-- 3. Create email_login_tokens table
-- =========================================
CREATE TABLE IF NOT EXISTS email_login_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email_login_tokens
CREATE INDEX IF NOT EXISTS idx_email_login_tokens_hash 
    ON email_login_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_email_login_tokens_expires 
    ON email_login_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_login_tokens_email 
    ON email_login_tokens(email);

-- =========================================
-- 4. Enable RLS on email_login_tokens
-- =========================================
ALTER TABLE email_login_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (server-side only)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_login_tokens' 
        AND policyname = 'Service role can manage email_login_tokens'
    ) THEN
        CREATE POLICY "Service role can manage email_login_tokens"
            ON email_login_tokens FOR ALL TO service_role
            USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =========================================
-- 5. Add comment for documentation
-- =========================================
COMMENT ON TABLE email_login_tokens IS 
    'Stores short-lived tokens for email magic link login';

COMMENT ON COLUMN public.users.linked_email IS 
    'Email address linked by user for desktop magic link login';

COMMENT ON COLUMN public.users.onboarding_modal_shown IS 
    'Whether user has seen the dashboard onboarding modal';

COMMENT ON COLUMN public.users.onboarding_source IS 
    'How the user first registered: whatsapp, telegram, invite, or web';

-- =========================================
-- 6. Verification query - run after migration
-- =========================================
-- Uncomment and run to verify changes:
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'email_login_tokens';
*/

-- =========================================
-- Done! Migration complete.
-- =========================================
