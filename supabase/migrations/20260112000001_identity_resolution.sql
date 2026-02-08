-- Migration: 20260112_identity_resolution.sql
-- Description: Add indexes and constraints for unified identity resolution
-- This enables the identity.ts module to efficiently find users by any identifier

-- ============================================
-- 1. Unique indexes for identity fields
-- ============================================

-- Unique index on linked_email (case-insensitive)
-- This ensures no two users can have the same email
CREATE UNIQUE INDEX IF NOT EXISTS users_linked_email_unique 
  ON users (lower(linked_email)) 
  WHERE linked_email IS NOT NULL;

-- Unique index on telegram_chat_id
-- Each Telegram chat ID can only belong to one user
CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_chat_id_unique 
  ON users (telegram_chat_id) 
  WHERE telegram_chat_id IS NOT NULL;

-- ============================================
-- 2. Composite index for OR lookups
-- ============================================

-- This speeds up the findUserByIdentifier() queries that check multiple fields
CREATE INDEX IF NOT EXISTS users_identity_lookup_idx 
  ON users (phone_number, linked_email);

-- ============================================
-- 3. Phone verification tracking
-- ============================================

-- Add column to track when phone was verified via messaging channel
-- Phone is "unverified" until we receive a WhatsApp/Telegram message from it
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- ============================================
-- 4. Identity linking audit column
-- ============================================

-- Track when identifiers were linked to this account
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_linked_at TIMESTAMPTZ;

-- ============================================
-- NOTE: Phone normalization
-- ============================================
-- All phones should be in E.164 format (+XXXXXXXXXXX)
-- The identity.ts module's normalizePhone() function handles this
-- We're not adding a CHECK constraint here to allow gradual migration
-- of any existing non-E.164 phone numbers
