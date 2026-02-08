-- ===========================================
-- MyFamilyButler - Database Schema
-- Run this in your Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- HOUSEHOLDS TABLE
-- ===========================================
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,  -- Optional: "Doe Family" or auto-generated
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  display_name TEXT,  -- "Mom", "John", etc.
  is_admin BOOLEAN DEFAULT FALSE,
  firebase_uid TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'active', 'cancelled', 'expired')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_phone_number ON public.users(phone_number);
CREATE INDEX idx_users_household_id ON public.users(household_id);
CREATE INDEX idx_users_firebase_uid ON public.users(firebase_uid);

-- ===========================================
-- FAMILY MEMBERS TABLE (non-WhatsApp people)
-- ===========================================
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_members_household_id ON public.family_members(household_id);

-- ===========================================
-- HOUSEHOLD INVITES TABLE
-- ===========================================
CREATE TABLE public.household_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_household_invites_phone ON public.household_invites(phone_number);
CREATE INDEX idx_household_invites_status ON public.household_invites(status);

-- ===========================================
-- MESSAGES TABLE
-- ===========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice')),
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_messages_whatsapp_id ON public.messages(whatsapp_message_id);

-- ===========================================
-- REMINDERS TABLE
-- ===========================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_event_id ON public.reminders(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_reminders_remind_at ON public.reminders(remind_at);
CREATE INDEX idx_reminders_status ON public.reminders(status);

-- ===========================================
-- EVENTS TABLE (belongs to household, not user)
-- ===========================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id),
  
  -- Core fields
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  end_date DATE,
  event_time TIME,  -- NULL = all-day event
  is_all_day BOOLEAN DEFAULT false,
  
  -- Optional fields
  family_member TEXT,  -- Who it's for (plain text)
  location TEXT,
  description TEXT,
  
  -- Metadata
  source_message_id UUID REFERENCES public.messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_household_id ON public.events(household_id);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_family_member ON public.events(family_member);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Service role policies (for webhook/API)
CREATE POLICY "Service role can manage households"
  ON public.households FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage users"
  ON public.users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage family_members"
  ON public.family_members FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage household_invites"
  ON public.household_invites FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage messages"
  ON public.messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage reminders"
  ON public.reminders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage events"
  ON public.events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
