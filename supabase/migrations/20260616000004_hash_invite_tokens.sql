-- Migrate existing plaintext invite tokens to SHA-256 hashes.
-- New tokens are hashed before storage, so existing rows must be re-hashed
-- for the lookup code to find them.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

UPDATE public.household_invites
SET token = encode(extensions.digest(token, 'sha256'), 'hex')
WHERE length(token) < 64;
