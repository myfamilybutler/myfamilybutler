-- Migration: fix_email_invites_and_rls
-- Description: Enable email-only users and secure RLS policies

-- 1. Ensure phone_number is nullable to support email-only users
ALTER TABLE public.users ALTER COLUMN phone_number DROP NOT NULL;

-- 2. Drop deprecated 'email' column if it still exists (migrated to linked_email)
-- checking first to avoid errors
ALTER TABLE public.users DROP COLUMN IF EXISTS email;

-- 3. Ensure linked_email column exists (it should, but just in case)
-- (No IF NOT EXISTS for ADD COLUMN in standard Postgres without DO block, but assuming it exists or handled by previous migration)
-- If we need to add it:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS linked_email TEXT; 

-- 4. Secure RLS Policies
-- Remove the overly permissive "always true" policies created by the cleanup script.
-- These tables should only be accessed via Service Role (AdminClient) in our current architecture.
-- Access via Anon Key (Client Side) should be BLOCKED by default RLS.

-- Users table
DROP POLICY IF EXISTS "Enable read access for service role" ON users;
DROP POLICY IF EXISTS "Enable update access for service role" ON users;
-- (Keep specific user policies if any exist and are correct, but usually we just want Deny All for anon)

-- Households table
DROP POLICY IF EXISTS "Enable read access for households" ON households;
DROP POLICY IF EXISTS "Enable update access for households" ON households;

-- Events table
DROP POLICY IF EXISTS "Enable read access for events" ON events;
DROP POLICY IF EXISTS "Enable insert access for events" ON events;
DROP POLICY IF EXISTS "Enable update access for events" ON events;
DROP POLICY IF EXISTS "Enable delete access for events" ON events;

-- Reminders table
DROP POLICY IF EXISTS "Enable read access for reminders" ON reminders;
DROP POLICY IF EXISTS "Enable insert access for reminders" ON reminders;
DROP POLICY IF EXISTS "Enable update access for reminders" ON reminders;
DROP POLICY IF EXISTS "Enable delete access for reminders" ON reminders;

-- Family Members table
DROP POLICY IF EXISTS "Enable read access for family_members" ON family_members;
DROP POLICY IF EXISTS "Enable insert access for family_members" ON family_members;
DROP POLICY IF EXISTS "Enable update access for family_members" ON family_members;
DROP POLICY IF EXISTS "Enable delete access for family_members" ON family_members;

-- 5. Add a constraint to ensure user has EITHER phone OR linked_email
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_contact_check;
ALTER TABLE public.users ADD CONSTRAINT users_contact_check 
    CHECK (phone_number IS NOT NULL OR linked_email IS NOT NULL);
