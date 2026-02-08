-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. USERS: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = firebase_uid); -- Assuming we sync Firebase UID to auth.uid via Custom Claims or similar, strictly speaking we need to align how we auth. 
  -- START NOTE: Since we are using Firebase Auth on client but Supabase DB, 
  -- we rely on the implementation where we might normally mint a custom JWT or use the service role.
  -- For this template, we assume standard UUID matching if we migrated fully.
  -- A more common pattern with 'supabase-js' client-side is that we might be using the anon key.
  -- If we are using the service role for everything (which we are currently doing in src/lib/supabase.ts via getAdminClient),
  -- then RLS is bypassed. 
  -- THESE POLICIES PROTECT IF WE SWITCH TO CLIENT-SIDE AUTH.

-- 2. HOUSEHOLDS: Users can view their assigned household
CREATE POLICY "Users can view their household"
  ON households FOR SELECT
  USING (
    id IN (
      SELECT household_id FROM users WHERE auth.uid() = firebase_uid
    )
  );

-- 3. EVENTS: Users can view events in their household
CREATE POLICY "Users can view household events"
  ON events FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM users WHERE auth.uid() = firebase_uid
    )
  );

CREATE POLICY "Users can insert events in their household"
  ON events FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM users WHERE auth.uid() = firebase_uid
    )
  );

-- 4. REMINDERS: Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- ==========================================
-- NOTE:
-- Currently, src/lib/supabase.ts uses `getAdminClient()` which BYPASSES RLS.
-- These policies will enforce security once we switch to `supabase` (Anon Client) access.
-- ==========================================
