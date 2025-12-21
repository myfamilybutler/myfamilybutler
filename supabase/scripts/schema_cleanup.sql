-- ===========================================
-- Schema Cleanup Migration
-- ===========================================
-- Best practices cleanup for mobile-first onboarding
-- Run AFTER backing up your database

-- =========================================
-- RECOMMENDATION SUMMARY:
-- =========================================
-- 
-- KEEP AS-IS:
-- ✅ id, phone_number, household_id, display_name, is_admin
-- ✅ telegram_chat_id, subscription_status, stripe_customer_id
-- ✅ created_at, updated_at
-- ✅ linked_email, onboarding_modal_shown, onboarding_source (new)
--
-- CONSOLIDATE:
-- 🔄 email → linked_email (merge, then drop email)
--
-- DEPRECATE (keep but unused):
-- ⚠️ supabase_user_id - keep for backward compatibility
-- ⚠️ onboarding_completed - keep but less relevant now
--
-- =========================================

-- =========================================
-- STEP 1: Migrate existing email to linked_email
-- =========================================
-- If any users have email set but not linked_email, copy it over
UPDATE public.users 
SET linked_email = email 
WHERE email IS NOT NULL 
  AND linked_email IS NULL;

-- Verify migration (run this SELECT before dropping)
-- SELECT id, email, linked_email FROM public.users WHERE email IS NOT NULL;

-- =========================================
-- STEP 2: Drop redundant email column (OPTIONAL)
-- =========================================
-- Only run this if you've verified no code uses 'email' column
-- The new flow uses 'linked_email' exclusively

-- UNCOMMENT BELOW TO DROP (after verifying):
-- ALTER TABLE public.users DROP COLUMN IF EXISTS email;

-- =========================================
-- STEP 3: Add NOT NULL constraint to phone_number
-- =========================================
-- For mobile-first, phone number should be required
-- First check for nulls:
-- SELECT id, display_name FROM public.users WHERE phone_number IS NULL;

-- If no users have null phone_number, add constraint:
-- ALTER TABLE public.users ALTER COLUMN phone_number SET NOT NULL;

-- =========================================
-- STEP 4: Add unique constraint on linked_email
-- =========================================
-- Ensure no two users can have same linked_email
-- Check if constraint exists:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_linked_email_key'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_linked_email_key UNIQUE (linked_email);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =========================================
-- STEP 5: Create email_login_tokens if not exists
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

CREATE INDEX IF NOT EXISTS idx_email_login_tokens_hash 
    ON email_login_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_login_tokens_expires 
    ON email_login_tokens(expires_at);

ALTER TABLE email_login_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DO $$
BEGIN
    CREATE POLICY "Service role can manage email_login_tokens"
        ON email_login_tokens FOR ALL TO service_role
        USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =========================================
-- STEP 6: Add comments for documentation
-- =========================================
COMMENT ON COLUMN public.users.linked_email IS 
    'Email for desktop magic link login. Primary email identifier.';
    
COMMENT ON COLUMN public.users.onboarding_modal_shown IS 
    'TRUE after user has seen (or skipped) the dashboard onboarding modal.';
    
COMMENT ON COLUMN public.users.onboarding_source IS 
    'How user first registered: whatsapp, telegram, invite';

COMMENT ON COLUMN public.users.supabase_user_id IS 
    'DEPRECATED: Legacy Supabase Auth ID. Keep for backward compatibility.';

COMMENT ON COLUMN public.users.onboarding_completed IS 
    'DEPRECATED: With mobile-first flow, users are onboarded on first message.';

-- =========================================
-- VERIFICATION QUERIES
-- =========================================
-- Run these to verify cleanup:

-- Check users table structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' ORDER BY ordinal_position;

-- Check email_login_tokens exists:
-- SELECT * FROM information_schema.tables 
-- WHERE table_name = 'email_login_tokens';

-- =========================================
-- DONE!
-- =========================================
