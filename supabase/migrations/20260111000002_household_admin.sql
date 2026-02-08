-- Migration: Add is_household_admin column to users table
-- Date: 2026-01-11
-- Purpose: Separate household admin (family owner) from super admin (internal team)

-- 1. Add new column for household admin
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_household_admin BOOLEAN DEFAULT FALSE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_is_household_admin_idx ON public.users (is_household_admin) WHERE is_household_admin = TRUE;

-- 3. IMPORTANT: Run this manually to migrate existing data
-- Users who created households should be household admins
-- DO NOT auto-run this - review first in production
-- 
-- UPDATE public.users 
-- SET is_household_admin = TRUE 
-- WHERE household_id IS NOT NULL 
--   AND id IN (
--     SELECT DISTINCT created_by FROM public.households WHERE created_by IS NOT NULL
--   );
