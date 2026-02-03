-- Migration: Add version column for optimistic locking
-- This enables race-condition-free updates

-- Add version column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index for efficient version checks
CREATE INDEX IF NOT EXISTS idx_events_version ON events(id, version);

-- Add updated_at column if not exists
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON COLUMN events.version IS 'Optimistic locking version - incremented on each update';
COMMENT ON COLUMN events.updated_at IS 'Last update timestamp - auto-updated by trigger';
