-- Migration: Add message sequence tracking for per-user ordering
-- Ensures messages are processed in order per user

-- Create table for message sequences
CREATE TABLE IF NOT EXISTS message_sequences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_message_sequences_user ON message_sequences(user_id);

-- Create function to atomically get next sequence number
CREATE OR REPLACE FUNCTION get_next_message_sequence(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_sequence INTEGER;
BEGIN
  INSERT INTO message_sequences (user_id, last_sequence)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    last_sequence = message_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_next_sequence;
  
  RETURN v_next_sequence;
END;
$$;

COMMENT ON FUNCTION get_next_message_sequence IS 
'Atomically increments and returns the next sequence number for a user.
Used to ensure per-user message ordering in Inngest processing.';

-- Enable RLS
ALTER TABLE message_sequences ENABLE ROW LEVEL SECURITY;

-- Service role can manage sequences
CREATE POLICY "Service role full access" ON message_sequences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
