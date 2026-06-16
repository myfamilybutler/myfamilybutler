-- Migration: Unique partial index to prevent duplicate pending reminders
-- Purpose: Guard against duplicate 30-minute (or custom) reminders for the same event/user/time,
--          both from the pipeline auto-creating default reminders and from UI/API races.

CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_event_user_remind_at_unique
  ON public.reminders(event_id, user_id, remind_at)
  WHERE status = 'pending';

COMMENT ON INDEX public.idx_reminders_event_user_remind_at_unique IS
  'Ensures only one pending reminder per event/user/remind_at combination.';
