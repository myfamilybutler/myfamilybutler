-- Migration: support_open_invites
-- Description: Allow invites without phone numbers (token-based open invites)

-- 1. Ensure token column exists and is unique
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'household_invites' AND column_name = 'token') THEN
        ALTER TABLE household_invites ADD COLUMN token UUID DEFAULT gen_random_uuid();
        ALTER TABLE household_invites ADD CONSTRAINT household_invites_token_key UNIQUE (token);
    END IF;
END $$;

-- 2. Make phone_number nullable to support open invites and email-only invites
ALTER TABLE household_invites ALTER COLUMN phone_number DROP NOT NULL;

-- 3. Add check constraint to ensure at least one contact method OR a token is present
-- effectively we always require a token now for new invites, but this constraint ensures validity.
-- We drop existing constraint if exists to avoid conflicts.
ALTER TABLE household_invites DROP CONSTRAINT IF EXISTS household_invites_contact_check;

ALTER TABLE household_invites 
    ADD CONSTRAINT household_invites_contact_check 
    CHECK (
        phone_number IS NOT NULL OR 
        email IS NOT NULL OR 
        token IS NOT NULL
    );

-- 4. Create an index on token for fast lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_household_invites_token 
    ON household_invites(token);
