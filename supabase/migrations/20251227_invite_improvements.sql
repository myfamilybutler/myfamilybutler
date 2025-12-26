-- Migration: Add email, token, and expires_at to household_invites
-- Date: 2025-12-27

-- 1. Add new columns
ALTER TABLE public.household_invites 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS token text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Add unique constraint to token (Idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'household_invites_token_key') THEN 
    ALTER TABLE public.household_invites ADD CONSTRAINT household_invites_token_key UNIQUE (token); 
  END IF; 
END $$;

-- 3. Add check constraint to ensure either phone_number or email is present (Idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'household_invites_contact_check') THEN 
    ALTER TABLE public.household_invites ADD CONSTRAINT household_invites_contact_check CHECK ((phone_number IS NOT NULL) OR (email IS NOT NULL)); 
  END IF; 
END $$;

-- 3.5. Allow phone_number to be null (since we now have email)
ALTER TABLE public.household_invites 
ALTER COLUMN phone_number DROP NOT NULL;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS household_invites_token_idx ON public.household_invites (token);
CREATE INDEX IF NOT EXISTS household_invites_email_idx ON public.household_invites (email);
