-- Add end_date for multi-day event support (inclusive end date)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Backfill existing rows as single-day events
UPDATE public.events
SET end_date = event_date
WHERE end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
