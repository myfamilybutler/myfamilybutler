-- Migration: invite state machine + open-link compatibility
-- Purpose:
-- 1) Support explicit invite decisions (decline/revoke)
-- 2) Keep token-only invites valid for QR/open joins

-- 1. Expand invite status values.
ALTER TABLE public.household_invites
  DROP CONSTRAINT IF EXISTS household_invites_status_check;

ALTER TABLE public.household_invites
  ADD CONSTRAINT household_invites_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired'));

COMMENT ON COLUMN public.household_invites.status IS
  'Invite lifecycle: pending, accepted, declined, revoked, expired';

-- 2. Ensure open invites are valid (token-only allowed).
ALTER TABLE public.household_invites
  DROP CONSTRAINT IF EXISTS household_invites_contact_check;

ALTER TABLE public.household_invites
  ADD CONSTRAINT household_invites_contact_check
  CHECK (
    phone_number IS NOT NULL OR
    email IS NOT NULL OR
    token IS NOT NULL
  );
