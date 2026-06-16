-- Migration: 20260616_central_supabase_auth.sql
-- Description: Centralize authentication on native Supabase Auth.
--              New auth.users rows are automatically synced to public.users.
--
-- NOTE: Existing public.users rows that were created via WhatsApp/Telegram/magic
-- links do not automatically get auth.users identities. A separate backfill
-- migration (or manual script) is required if those users need web login.

-- Allow 'web' as an onboarding source (used by standard email/password sign-ups).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_onboarding_source_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_onboarding_source_check
  CHECK (onboarding_source IN ('whatsapp', 'telegram', 'invite', 'email_invite', 'web'));

-- Trigger function to sync public.users on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    linked_email,
    display_name,
    subscription_status,
    onboarding_source,
    email_verified
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    'free',
    'web',
    new.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    linked_email = EXCLUDED.linked_email,
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
    email_verified = EXCLUDED.email_verified;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to sync public.users on auth.users UPDATE (email/verification changes)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    linked_email = new.email,
    email_verified = new.email_confirmed_at IS NOT NULL
  WHERE id = new.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers are idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
