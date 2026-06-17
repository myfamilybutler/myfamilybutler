-- Migration: Create dead_letter_queue and add deterministic deduplication key
-- Prevents duplicate DLQ rows when Inngest retries the same failed message.

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed_permanently')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_job_type ON dead_letter_queue(job_type);

ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON dead_letter_queue;
CREATE POLICY "Service role full access" ON dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE dead_letter_queue IS 'Stores failed jobs for later inspection and retry';
COMMENT ON COLUMN dead_letter_queue.job_type IS 'Type of job that failed (e.g., message_processing, reminder_send)';
COMMENT ON COLUMN dead_letter_queue.payload IS 'Original job payload';
COMMENT ON COLUMN dead_letter_queue.status IS 'Current status: pending, processed, or failed_permanently';

ALTER TABLE dead_letter_queue
  ADD COLUMN IF NOT EXISTS message_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT NULL;

-- Unique constraint for message-processing failures so retries are idempotent.
ALTER TABLE dead_letter_queue
  DROP CONSTRAINT IF EXISTS dead_letter_queue_message_id_channel_unique;

ALTER TABLE dead_letter_queue
  ADD CONSTRAINT dead_letter_queue_message_id_channel_unique
  UNIQUE (message_id, channel);

-- Index for quick lookups by the deduplication key.
CREATE INDEX IF NOT EXISTS idx_dlq_message_id_channel
  ON dead_letter_queue(message_id, channel);
