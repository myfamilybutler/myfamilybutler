-- Atomic household creation for onboarding flows.
-- Locks the user row so two concurrent onboarding requests cannot create
-- duplicate households for the same user.
CREATE OR REPLACE FUNCTION public.create_household_for_user(
  p_user_id uuid,
  p_household_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_household_id uuid;
  v_existing_household_id uuid;
BEGIN
  -- Lock the user row and read the current household_id.
  SELECT household_id INTO v_existing_household_id
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  -- If the user already belongs to a household, return it.
  IF v_existing_household_id IS NOT NULL THEN
    RETURN v_existing_household_id;
  END IF;

  -- Create the household.
  INSERT INTO public.households (name)
  VALUES (p_household_name)
  RETURNING id INTO v_household_id;

  -- Link the user as household admin.
  UPDATE public.users
  SET household_id = v_household_id,
      is_household_admin = true
  WHERE id = p_user_id;

  RETURN v_household_id;
END;
$$;
