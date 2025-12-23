-- ===========================================
-- Google Calendar Sync Schema Updates
-- ===========================================
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new

-- ===========================================
-- 1. Add sync columns to events table
-- ===========================================

-- Google Calendar event ID (for linking our events to Google)
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Event fingerprint for deduplication  
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS event_fingerprint TEXT;

-- Track when event was last synced to Google
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;

-- Track source of event (local = created in app, google = imported from Google)
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'local' 
  CHECK (sync_source IN ('local', 'google'));

-- ===========================================
-- 2. Add indexes for efficient lookups
-- ===========================================

-- Unique index on google_event_id (only one local event per Google event)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_google_event_id 
  ON public.events(google_event_id) 
  WHERE google_event_id IS NOT NULL;

-- UNIQUE index on (household_id, fingerprint) for atomic deduplication
-- This prevents race conditions in createEvent() - if two requests try to 
-- insert the same event simultaneously, one will fail with 23505 error
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_fingerprint 
  ON public.events(household_id, event_fingerprint) 
  WHERE event_fingerprint IS NOT NULL;

-- ===========================================
-- 3. Add sync_token to oauth tokens table
-- ===========================================

-- Sync token for incremental sync with Google Calendar
ALTER TABLE public.user_oauth_tokens 
  ADD COLUMN IF NOT EXISTS sync_token TEXT;

-- Last time a full sync was performed
ALTER TABLE public.user_oauth_tokens 
  ADD COLUMN IF NOT EXISTS last_full_sync_at TIMESTAMPTZ;

-- ===========================================
-- 4. Add comments for documentation
-- ===========================================

COMMENT ON COLUMN public.events.google_event_id IS 
  'The Google Calendar event ID - used to update/delete events in Google';

COMMENT ON COLUMN public.events.event_fingerprint IS 
  'SHA-256 hash of normalized title + date + time for deduplication';

COMMENT ON COLUMN public.events.google_synced_at IS 
  'Timestamp of last successful sync to Google Calendar';

COMMENT ON COLUMN public.events.sync_source IS 
  'Whether event was created locally or imported from Google Calendar';

COMMENT ON COLUMN public.user_oauth_tokens.sync_token IS 
  'Google Calendar API sync token for incremental sync';

-- ===========================================
-- 5. Verify the migration
-- ===========================================

-- Uncomment to verify columns were added:
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events' 
  AND column_name IN ('google_event_id', 'event_fingerprint', 'google_synced_at', 'sync_source')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_oauth_tokens' 
  AND column_name IN ('sync_token', 'last_full_sync_at')
ORDER BY column_name;
*/
