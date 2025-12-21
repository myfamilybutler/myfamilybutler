-- ===========================================
-- Post-Cleanup Verification Script
-- ===========================================
-- Run this after schema_cleanup.sql to verify everything is correct

-- =========================================
-- 1. Users table columns (should have all new fields)
-- =========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- =========================================
-- 2. Check email_login_tokens table exists
-- =========================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM email_login_tokens) AS row_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'email_login_tokens';

-- =========================================
-- 3. Check all required tables exist
-- =========================================
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'households', 'family_members', 
                           'household_invites', 'messages', 'reminders', 
                           'events', 'magic_tokens', 'email_login_tokens')
        THEN '✅ Required'
        ELSE '⚠️ Extra'
    END AS status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY status DESC, table_name;

-- =========================================
-- 4. Check constraints on users table
-- =========================================
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY constraint_type, constraint_name;

-- =========================================
-- 5. Check indexes on users table
-- =========================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY indexname;

-- =========================================
-- 6. Verify new onboarding columns exist
-- =========================================
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'linked_email'
    ) THEN '✅' ELSE '❌' END AS linked_email,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_modal_shown'
    ) THEN '✅' ELSE '❌' END AS onboarding_modal_shown,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_source'
    ) THEN '✅' ELSE '❌' END AS onboarding_source;

-- =========================================
-- 7. Check RLS policies
-- =========================================
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =========================================
-- 8. Sample user data (first 5 users)
-- =========================================
SELECT 
    id,
    phone_number,
    display_name,
    linked_email,
    onboarding_source,
    onboarding_modal_shown,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
