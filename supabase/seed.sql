-- ===========================================
-- MyFamilyButler - Seed Data
-- Automatically loaded during local Supabase DB reset
-- ===========================================

-- 1. Create a mock household
INSERT INTO public.households (id, name)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Miller Family')
ON CONFLICT (id) DO NOTHING;

-- 2. Create mock users (Mom & Dad)
-- Note: Replace phone numbers with your local testing numbers if desired
INSERT INTO public.users (id, phone_number, household_id, display_name, is_admin, onboarding_completed, subscription_status)
VALUES
  (
    '00000000-0000-0000-0000-000000000001', 
    '+436601234567', 
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    'Sarah (Mom)', 
    true, 
    true, 
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000002', 
    '+436609876543', 
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    'Thomas (Dad)', 
    false, 
    true, 
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Create mock family members (non-users, e.g., kids or pets)
INSERT INTO public.family_members (id, household_id, name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Emma'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Max')
ON CONFLICT (id) DO NOTHING;

-- 4. Create some realistic family calendar events
INSERT INTO public.events (id, household_id, created_by, title, event_date, end_date, event_time, is_all_day, family_member, location, description)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000001',
    'Elternabend Volksschule (Parent-Teacher Meeting)',
    CURRENT_DATE + INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '2 days',
    '18:30:00',
    false,
    'Emma',
    'Klassenraum 2B',
    'Bitte Zettel für den Schwimmkurs unterschrieben mitbringen.'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000002',
    'Zahnarzt Max (Dentist)',
    CURRENT_DATE + INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '5 days',
    '14:15:00',
    false,
    'Max',
    'Dr. Gruber, Hauptstraße 12',
    'Jahreskontrolle'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000001',
    'Schwimmtraining Emma',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '7 days',
    '16:00:00',
    false,
    'Emma',
    'Städtisches Hallenbad',
    'Turnsachen und Badekappe mitnehmen.'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000001',
    'Familienausflug Zoo Schönbrunn',
    CURRENT_DATE + INTERVAL '12 days',
    CURRENT_DATE + INTERVAL '12 days',
    NULL,
    true,
    NULL,
    'Schönbrunn, Wien',
    'Ganztägiger Ausflug mit Oma und Opa.'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Create some mock messages representing user interactions
INSERT INTO public.messages (id, user_id, role, content, type, created_at)
VALUES
  (
    'm0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'user',
    'Emma hat am übermorgen um 18:30 Uhr Elternabend',
    'text',
    NOW() - INTERVAL '5 minutes'
  ),
  (
    'm0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'assistant',
    'Ich habe den Elternabend für Emma am übermorgen um 18:30 Uhr eingetragen.',
    'text',
    NOW() - INTERVAL '4 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Create some mock reminders for the upcoming events
INSERT INTO public.reminders (id, user_id, event_id, message, remind_at, status)
VALUES
  (
    'r0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Erinnerung: Elternabend Volksschule für Emma heute um 18:30',
    CURRENT_DATE + INTERVAL '2 days' + INTERVAL '17 hours',
    'pending'
  ),
  (
    'r0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002',
    'Erinnerung: Zahnarzt Max in 1 Stunde (14:15)',
    CURRENT_DATE + INTERVAL '5 days' + INTERVAL '13 hours' + INTERVAL '15 minutes',
    'pending'
  )
ON CONFLICT (id) DO NOTHING;
