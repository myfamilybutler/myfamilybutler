-- Fix accept_household_invite RPC:
-- 1. Validate that the provided household_id matches the invite's household.
-- 2. Reject expired invites.
-- 3. Preserve admin flag when re-accepting the same household.
CREATE OR REPLACE FUNCTION public.accept_household_invite(
    p_user_id UUID,
    p_invite_id UUID,
    p_household_id UUID,
    p_force_switch BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite RECORD;
    v_existing_household_id UUID;
    v_rows_affected INT;
BEGIN
    -- 1. Lock the invite row to prevent concurrent accepts
    SELECT status, household_id, expires_at
    INTO v_invite
    FROM household_invites
    WHERE id = p_invite_id
    FOR UPDATE;

    -- 2. Validate invite state
    IF v_invite IS NULL THEN
        RAISE NOTICE 'Invite not found';
        RETURN FALSE;
    END IF;

    IF v_invite.status != 'pending' THEN
        RAISE NOTICE 'Invite already %', v_invite.status;
        RETURN FALSE;
    END IF;

    IF v_invite.household_id IS DISTINCT FROM p_household_id THEN
        RAISE NOTICE 'Invite household mismatch';
        RETURN FALSE;
    END IF;

    IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
        UPDATE household_invites
        SET status = 'expired'
        WHERE id = p_invite_id;
        RAISE NOTICE 'Invite expired';
        RETURN FALSE;
    END IF;

    -- 3. Lock the user row and check whether they already belong to a household.
    SELECT household_id INTO v_existing_household_id
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_existing_household_id IS NOT NULL AND v_existing_household_id != p_household_id AND NOT p_force_switch THEN
        RAISE NOTICE 'User already belongs to a different household';
        RETURN FALSE;
    END IF;

    -- 4. Atomic Update Transaction
    UPDATE household_invites
    SET status = 'accepted'
    WHERE id = p_invite_id;

    UPDATE users
    SET
        household_id = p_household_id,
        is_household_admin = CASE
            WHEN v_existing_household_id IS NOT DISTINCT FROM p_household_id THEN is_household_admin
            ELSE FALSE
        END
    WHERE id = p_user_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Transaction failed: %', SQLERRM;
        RETURN FALSE;
END;
$$;
