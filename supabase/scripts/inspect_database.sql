-- ===========================================
-- Database Inspection Script
-- ===========================================
-- Run this in Supabase SQL Editor to see current database structure
-- This will help identify unnecessary tables and schemas

-- =========================================
-- 1. List all schemas (excluding system schemas)
-- =========================================
SELECT 
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- =========================================
-- 2. List all tables with row counts
-- =========================================
SELECT 
    schemaname AS schema,
    relname AS table_name,
    n_live_tup AS estimated_row_count
FROM pg_stat_user_tables
ORDER BY schemaname, relname;

-- =========================================
-- 3. Detailed table structure (columns, types)
-- =========================================
SELECT 
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- =========================================
-- 4. List all indexes
-- =========================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =========================================
-- 5. List all foreign key constraints
-- =========================================
SELECT
    tc.table_name AS table_name,
    kcu.column_name AS column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =========================================
-- 6. List RLS policies
-- =========================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =========================================
-- 7. Storage usage by table
-- =========================================
SELECT
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS data_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- =========================================
-- 8. Check for tables not in expected schema
-- =========================================
-- Expected tables for MyFamilyButler:
-- households, users, family_members, household_invites, messages, reminders, events, magic_tokens

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (
        'households', 
        'users', 
        'family_members', 
        'household_invites', 
        'messages', 
        'reminders', 
        'events', 
        'magic_tokens',
        'email_login_tokens'  -- New table from onboarding migration
    )
ORDER BY table_name;

-- =========================================
-- 9. Check users table current columns
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
