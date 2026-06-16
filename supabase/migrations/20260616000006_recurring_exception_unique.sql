CREATE UNIQUE INDEX IF NOT EXISTS events_parent_exception_unique
ON events (parent_event_id, event_date, is_exception)
WHERE is_exception = true;
