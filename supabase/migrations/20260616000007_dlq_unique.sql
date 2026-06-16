-- Migration: Add deterministic deduplication key to dead letter queue
-- Prevents duplicate DLQ rows when Inngest retries the same failed message.

ALTER TABLE dead_letter_queue
  ADD COLUMN IF NOT EXISTS message_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT NULL;

-- Unique constraint for message-processing failures so retries are idempotent.
ALTER TABLE dead_letter_queue
  ADD CONSTRAINT dead_letter_queue_message_id_channel_unique
  UNIQUE (message_id, channel);

-- Index for quick lookups by the deduplication key.
CREATE INDEX IF NOT EXISTS idx_dlq_message_id_channel
  ON dead_letter_queue(message_id, channel);
