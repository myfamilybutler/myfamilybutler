-- Household deletion cleanup + open-invite constraint fix.
-- 1. Ensures deleting a household also removes household-scoped messages and
--    manual (non-event) reminders for members of that household, so rows are
--    not left orphaned after the household and its events are gone.
-- 2. Relaxes the household_invites contact check so token-based open invites
--    (no phone/email) are valid.

CREATE OR REPLACE FUNCTION public.delete_household_atomic(
  p_household_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_remaining integer;
  v_member_ids uuid[];
BEGIN
  -- Verify the caller is an admin of the target household and lock their row.
  SELECT is_household_admin INTO v_is_admin
  FROM public.users
  WHERE id = p_user_id AND household_id = p_household_id
  FOR UPDATE;

  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RETURN false;
  END IF;

  -- Remember the members of this household before unlinking them.
  SELECT array_agg(id) INTO v_member_ids
  FROM public.users
  WHERE household_id = p_household_id;

  -- Lock and unlink every member of the household.
  UPDATE public.users
  SET household_id = null,
      is_household_admin = false
  WHERE household_id = p_household_id;

  -- Safety check: if any member is still linked (concurrent race), abort.
  SELECT COUNT(*) INTO v_remaining
  FROM public.users
  WHERE household_id = p_household_id;

  IF v_remaining > 0 THEN
    RETURN false;
  END IF;

  -- Remove household-scoped messages and manual reminders for members so they
  -- are not left orphaned after the household is deleted.
  DELETE FROM public.messages
  WHERE household_id = p_household_id;

  DELETE FROM public.reminders
  WHERE event_id IS NULL
    AND v_member_ids IS NOT NULL
    AND user_id = ANY(v_member_ids);

  -- Cascade deletes handle family_members, events, invites, draft_bundles/draft_events.
  DELETE FROM public.households
  WHERE id = p_household_id;

  RETURN true;
END;
$$;

-- Open invites have no phone or email, only a token. Replace the overly
-- strict contact check with one that accepts a token as the contact mechanism.
ALTER TABLE public.household_invites
  DROP CONSTRAINT IF EXISTS household_invites_contact_check;

ALTER TABLE public.household_invites
  ADD CONSTRAINT household_invites_contact_check
  CHECK (
    phone_number IS NOT NULL
    OR email IS NOT NULL
    OR token IS NOT NULL
  );
