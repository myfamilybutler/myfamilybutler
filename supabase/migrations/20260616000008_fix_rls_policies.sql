-- ==========================================
-- Migration: 20260616000008_fix_rls_policies.sql
-- Purpose: Fix Row Level Security policies that still referenced the
--          non-existent firebase_uid column. public.users.id is the
--          Supabase Auth UUID, so policies now use auth.uid() = id.
--          Also adds missing UPDATE/DELETE policies for events,
--          reminders, messages, family_members, and households.
--
-- NOTE: The app currently uses the service-role client, which bypasses
--       RLS. These policies are written to be semantically correct for
--       future anon-client use.
-- ==========================================

-- Enable RLS on the core tables (idempotent)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_members ENABLE ROW LEVEL SECURITY;

-- messages may gain a household_id column for household-scoped sharing.
-- Add it safely if it does not already exist so the messages policies below
-- can reference it without error.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_household_id ON public.messages(household_id);

-- ==========================================
-- 1. USERS
-- ==========================================

-- Drop old policies that referenced firebase_uid
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Users can read/insert/update/delete only their own row.
-- public.users.id is the Supabase Auth UUID.
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_delete_own ON public.users;
CREATE POLICY users_delete_own
  ON public.users FOR DELETE
  USING (auth.uid() = id);

-- ==========================================
-- 2. HOUSEHOLDS
-- ==========================================

-- Drop old policy that referenced firebase_uid
DROP POLICY IF EXISTS "Users can view their household" ON public.households;

DROP POLICY IF EXISTS households_select_member ON public.households;
CREATE POLICY households_select_member
  ON public.households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = households.id
    )
  );

DROP POLICY IF EXISTS households_update_admin ON public.households;
CREATE POLICY households_update_admin
  ON public.households FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = households.id
        AND u.is_household_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = households.id
        AND u.is_household_admin = true
    )
  );

DROP POLICY IF EXISTS households_delete_admin ON public.households;
CREATE POLICY households_delete_admin
  ON public.households FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = households.id
        AND u.is_household_admin = true
    )
  );

-- ==========================================
-- 3. EVENTS
-- ==========================================

-- Drop old policies that referenced firebase_uid
DROP POLICY IF EXISTS "Users can view household events" ON public.events;
DROP POLICY IF EXISTS "Users can insert events in their household" ON public.events;

DROP POLICY IF EXISTS events_select_household_or_creator ON public.events;
CREATE POLICY events_select_household_or_creator
  ON public.events FOR SELECT
  USING (
    events.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = events.household_id
    )
  );

DROP POLICY IF EXISTS events_insert_household ON public.events;
CREATE POLICY events_insert_household
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = events.household_id
    )
  );

DROP POLICY IF EXISTS events_update_household_or_creator ON public.events;
CREATE POLICY events_update_household_or_creator
  ON public.events FOR UPDATE
  USING (
    events.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = events.household_id
    )
  )
  WITH CHECK (
    events.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = events.household_id
    )
  );

DROP POLICY IF EXISTS events_delete_household_or_creator ON public.events;
CREATE POLICY events_delete_household_or_creator
  ON public.events FOR DELETE
  USING (
    events.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = events.household_id
    )
  );

-- ==========================================
-- 4. REMINDERS
-- ==========================================

-- Drop old policy that referenced firebase_uid
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;

DROP POLICY IF EXISTS reminders_select_own ON public.reminders;
CREATE POLICY reminders_select_own
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_insert_own ON public.reminders;
CREATE POLICY reminders_insert_own
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_update_own ON public.reminders;
CREATE POLICY reminders_update_own
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reminders_delete_own ON public.reminders;
CREATE POLICY reminders_delete_own
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. MESSAGES
-- ==========================================

DROP POLICY IF EXISTS messages_select_own_or_household ON public.messages;
CREATE POLICY messages_select_own_or_household
  ON public.messages FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      messages.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.household_id = messages.household_id
      )
    )
  );

DROP POLICY IF EXISTS messages_insert_own_or_household ON public.messages;
CREATE POLICY messages_insert_own_or_household
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR (
      messages.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.household_id = messages.household_id
      )
    )
  );

DROP POLICY IF EXISTS messages_update_own_or_household ON public.messages;
CREATE POLICY messages_update_own_or_household
  ON public.messages FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      messages.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.household_id = messages.household_id
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      messages.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.household_id = messages.household_id
      )
    )
  );

DROP POLICY IF EXISTS messages_delete_own_or_household ON public.messages;
CREATE POLICY messages_delete_own_or_household
  ON public.messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      messages.household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.household_id = messages.household_id
      )
    )
  );

-- ==========================================
-- 6. FAMILY_MEMBERS
-- ==========================================

DROP POLICY IF EXISTS family_members_select_household ON public.family_members;
CREATE POLICY family_members_select_household
  ON public.family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = family_members.household_id
    )
  );

DROP POLICY IF EXISTS family_members_insert_household ON public.family_members;
CREATE POLICY family_members_insert_household
  ON public.family_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = family_members.household_id
    )
  );

DROP POLICY IF EXISTS family_members_update_household ON public.family_members;
CREATE POLICY family_members_update_household
  ON public.family_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = family_members.household_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = family_members.household_id
    )
  );

DROP POLICY IF EXISTS family_members_delete_household ON public.family_members;
CREATE POLICY family_members_delete_household
  ON public.family_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.household_id = family_members.household_id
    )
  );
