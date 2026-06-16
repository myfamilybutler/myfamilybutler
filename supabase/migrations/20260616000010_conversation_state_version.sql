-- Migration: Add optimistic-concurrency version column to conversation_state
-- Purpose: Prevent last-write-wins races when multiple workers update conversation state.

ALTER TABLE public.conversation_state
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.conversation_state.version IS
  'Monotonically incremented on each update; used for optimistic concurrency control.';
