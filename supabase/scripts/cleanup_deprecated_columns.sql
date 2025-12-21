-- ===========================================
-- Database Cleanup: Remove Deprecated Columns
-- ===========================================
-- 
-- This script removes columns that are no longer used by the phone-first
-- onboarding architecture. The old Supabase Auth flow has been replaced
-- with WhatsApp/Telegram + email magic links.
--
-- IMPORTANT: RLS policies depend on supabase_user_id, so we need to
-- drop them first and recreate them using the new approach.
--
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new
-- ===========================================

-- 1. First, verify current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('users', 'households', 'events', 'reminders', 'family_members')
ORDER BY tablename, policyname;

-- ===========================================
-- STEP 1: Backup data (RECOMMENDED)
-- ===========================================

-- Create backup of user data before cleanup
CREATE TABLE IF NOT EXISTS users_backup_before_cleanup AS 
SELECT * FROM users;

-- Verify backup
SELECT COUNT(*) as backup_count FROM users_backup_before_cleanup;

-- ===========================================
-- STEP 2: Drop OLD RLS policies that depend on supabase_user_id
-- ===========================================

-- Drop users policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Drop households policies  
DROP POLICY IF EXISTS "Users can view their household" ON households;

-- Drop events policies
DROP POLICY IF EXISTS "Users can view household events" ON events;
DROP POLICY IF EXISTS "Users can insert events in their household" ON events;
DROP POLICY IF EXISTS "Users can update household events" ON events;
DROP POLICY IF EXISTS "Users can delete household events" ON events;

-- Drop reminders policies
DROP POLICY IF EXISTS "Users can view own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

-- Drop family_members policies (if any)
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Users can manage family members" ON family_members;

-- ===========================================
-- STEP 3: Migrate email → linked_email (if needed)
-- ===========================================

-- Migrate email to linked_email for users who don't have linked_email set
UPDATE users 
SET linked_email = email 
WHERE email IS NOT NULL 
AND (linked_email IS NULL OR linked_email = '');

-- ===========================================
-- STEP 4: Remove deprecated columns
-- ===========================================

-- Now we can safely drop the columns
ALTER TABLE public.users DROP COLUMN IF EXISTS email;
ALTER TABLE public.users DROP COLUMN IF EXISTS supabase_user_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS onboarding_completed;

-- ===========================================
-- STEP 5: Create NEW RLS policies
-- ===========================================
-- 
-- NOTE: Since we now use cookie-based sessions authenticated server-side,
-- RLS policies are LESS important (we use service role key for API calls).
-- 
-- However, for safety we'll create basic policies. If you don't use
-- direct client-side Supabase access, you can disable RLS entirely.

-- For users table - allow read via service role (which bypasses RLS anyway)
-- These are here for safety if client-side access is ever added back

-- Allow users to be read by anyone authenticated (server validates via cookies)
CREATE POLICY "Enable read access for service role" ON users
    FOR SELECT USING (true);

-- Allow updates via service role
CREATE POLICY "Enable update access for service role" ON users
    FOR UPDATE USING (true);

-- For households - open read (server handles auth)
CREATE POLICY "Enable read access for households" ON households
    FOR SELECT USING (true);

CREATE POLICY "Enable update access for households" ON households  
    FOR UPDATE USING (true);

-- For events - open access (server handles auth via API)
CREATE POLICY "Enable read access for events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for events" ON events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for events" ON events
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for events" ON events
    FOR DELETE USING (true);

-- For reminders - open access (server handles auth)
CREATE POLICY "Enable read access for reminders" ON reminders
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for reminders" ON reminders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for reminders" ON reminders
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for reminders" ON reminders
    FOR DELETE USING (true);

-- For family_members - open access (server handles auth)
CREATE POLICY "Enable read access for family_members" ON family_members
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for family_members" ON family_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for family_members" ON family_members
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for family_members" ON family_members
    FOR DELETE USING (true);

-- ===========================================
-- STEP 6: Add constraints
-- ===========================================

-- Drop existing constraints first (use constraint, not index)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_linked_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_number_key;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_linked_email_unique ON users(linked_email) WHERE linked_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique ON users(phone_number) WHERE phone_number IS NOT NULL;

-- ===========================================
-- STEP 7: Verify cleanup
-- ===========================================

-- Show remaining columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Show new policies
SELECT 
    tablename,
    policyname
FROM pg_policies 
WHERE tablename IN ('users', 'households', 'events', 'reminders', 'family_members')
ORDER BY tablename, policyname;

-- Count users by source
SELECT 
    onboarding_source,
    COUNT(*) as user_count
FROM users
GROUP BY onboarding_source;

-- ===========================================
-- DONE! 
-- ===========================================
-- 
-- Your database is now cleaned up for the phone-first architecture.
-- 
-- To delete the backup table after confirming everything works:
-- DROP TABLE users_backup_before_cleanup;
