-- ===========================================
-- Supabase Vault RPC Functions for Token Storage
-- Run this in your Supabase SQL Editor
-- ===========================================

-- Enable the vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- ===========================================
-- VAULT RPC FUNCTIONS
-- ===========================================

/**
 * Create a new secret in the vault
 * Uses pgsodium encryption for secure storage
 */
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret_name TEXT,
  secret_value TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO vault.secrets (name, secret)
  VALUES (secret_name, secret_value);
END;
$$;

/**
 * Read a secret from the vault
 * Returns the decrypted secret value
 */
CREATE OR REPLACE FUNCTION vault_read_secret(
  secret_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT decrypted_secret INTO result
  FROM vault.decrypted_secrets
  WHERE name = secret_name;
  
  RETURN result;
END;
$$;

/**
 * Update an existing secret in the vault
 */
CREATE OR REPLACE FUNCTION vault_update_secret(
  secret_name TEXT,
  new_secret TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret
  WHERE name = secret_name;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Secret not found: %', secret_name;
  END IF;
END;
$$;

/**
 * Delete a secret from the vault
 */
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM vault.secrets
  WHERE name = secret_name;
END;
$$;

-- ===========================================
-- GRANT PERMISSIONS
-- Only service_role can access these functions
-- ===========================================

REVOKE ALL ON FUNCTION vault_create_secret(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vault_create_secret(TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION vault_read_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vault_read_secret(TEXT) TO service_role;

REVOKE ALL ON FUNCTION vault_update_secret(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vault_update_secret(TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION vault_delete_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vault_delete_secret(TEXT) TO service_role;

-- ===========================================
-- ADD google_event_id COLUMN TO EVENTS TABLE
-- For storing Google Calendar event IDs
-- ===========================================

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_google_event_id 
ON public.events(google_event_id);

COMMENT ON COLUMN public.events.google_event_id IS 'Google Calendar event ID for sync tracking';
