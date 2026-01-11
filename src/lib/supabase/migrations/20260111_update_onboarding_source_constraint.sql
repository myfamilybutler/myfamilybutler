-- Migration: update_onboarding_source_check
-- Description: Clean up data and add 'email_invite' (and '360dialog') to allowed values

-- 1. DATA CLEANUP: Update any onboarding_source that is NOT in the new allowed list.
-- This prevents the "constraint violated" error when we add the check.
-- We map any unknown/invalid source to 'invite' (safe fallback).
UPDATE public.users 
SET onboarding_source = 'invite'
WHERE onboarding_source NOT IN ('whatsapp', 'telegram', 'invite', 'email_invite', '360dialog');

-- 2. Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_onboarding_source_check;

-- 3. Add the updated constraint including ALL valid types
ALTER TABLE public.users ADD CONSTRAINT users_onboarding_source_check 
  CHECK (onboarding_source IN ('whatsapp', 'telegram', 'invite', 'email_invite', '360dialog'));
