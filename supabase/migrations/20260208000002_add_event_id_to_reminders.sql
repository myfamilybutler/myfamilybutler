-- Add explicit event linkage for reminders
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_reminders_event_id
  ON public.reminders(event_id)
  WHERE event_id IS NOT NULL;

-- Remove legacy fallback suffix from previously created reminder messages
UPDATE public.reminders
SET message = regexp_replace(
  message,
  '\\s*\\(Event: [0-9a-fA-F-]{36}\\)$',
  '',
  'g'
)
WHERE message ~ '\\(Event: [0-9a-fA-F-]{36}\\)$';
