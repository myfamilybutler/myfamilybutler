-- Migration: Add dead letter queue table
-- Stores failed jobs for later inspection and manual retry

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

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_job_type ON dead_letter_queue(job_type);

-- Enable RLS
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access DLQ
CREATE POLICY "Service role full access" ON dead_letter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE dead_letter_queue IS 'Stores failed jobs for later inspection and retry';
COMMENT ON COLUMN dead_letter_queue.job_type IS 'Type of job that failed (e.g., message_processing, reminder_send)';
COMMENT ON COLUMN dead_letter_queue.payload IS 'Original job payload';
COMMENT ON COLUMN dead_letter_queue.status IS 'Current status: pending, processed, or failed_permanently';
