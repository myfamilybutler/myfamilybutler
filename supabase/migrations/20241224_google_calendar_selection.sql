-- ===========================================
-- Google Calendar Selection
-- ===========================================
-- Allows users to select which Google Calendar to sync

-- Add calendar_id column (defaults to 'primary' for backwards compatibility)
ALTER TABLE public.user_oauth_tokens 
  ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT 'primary';

-- Add calendar_name for display purposes
ALTER TABLE public.user_oauth_tokens 
  ADD COLUMN IF NOT EXISTS calendar_name TEXT;

-- Add comments
COMMENT ON COLUMN public.user_oauth_tokens.calendar_id IS 
  'The Google Calendar ID to sync with. Defaults to primary.';

COMMENT ON COLUMN public.user_oauth_tokens.calendar_name IS 
  'Display name of the selected Google Calendar.';
