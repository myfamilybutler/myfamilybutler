-- Atomic household deletion for family deletion flows.
-- Locks the requesting admin and household rows, unlinks all members,
-- verifies no member is still linked, then deletes the household.
-- Related rows are removed by ON DELETE CASCADE.
CREATE OR REPLACE FUNCTION public.delete_household_atomic(
  p_household_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_remaining integer;
BEGIN
  -- Verify the caller is an admin of the target household and lock their row.
  SELECT is_household_admin INTO v_is_admin
  FROM public.users
  WHERE id = p_user_id AND household_id = p_household_id
  FOR UPDATE;

  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RETURN false;
  END IF;

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

  -- Cascade deletes handle family_members, events, invites, draft_bundles/draft_events.
  DELETE FROM public.households
  WHERE id = p_household_id;

  RETURN true;
END;
$$;
