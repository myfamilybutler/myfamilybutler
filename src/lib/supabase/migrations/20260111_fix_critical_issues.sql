-- Migration: Fix Critical Issues (Race Conditions & Deduplication)

-- 1. Create table for persistent webhook deduplication
CREATE TABLE IF NOT EXISTS public.processed_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB,
    UNIQUE(message_id, channel)
);

-- Index for cleanup and frequent lookups
CREATE INDEX IF NOT EXISTS idx_processed_messages_lookup ON public.processed_messages(message_id, channel);
CREATE INDEX IF NOT EXISTS idx_processed_messages_cleanup ON public.processed_messages(expires_at);

-- Enable RLS (Security Best Practice)
ALTER TABLE public.processed_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (webhooks run as service role)
CREATE POLICY "Service role full access" ON public.processed_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Create RPC function for Atomic Invite Acceptance
-- This replaces the "Parallel + Rollback" antipattern in db-families.ts
CREATE OR REPLACE FUNCTION public.accept_household_invite(
    p_user_id UUID,
    p_invite_id UUID,
    p_household_id UUID,
    p_force_switch BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (admin)
SET search_path = public
AS $$
DECLARE
    v_invite_status TEXT;
    v_existing_household_id UUID;
    v_rows_affected INT;
BEGIN
    -- 1. Lock the invite row to prevent concurrent accepts
    SELECT status INTO v_invite_status
    FROM household_invites
    WHERE id = p_invite_id
    FOR UPDATE; -- Explicit row lock

    -- 2. Validate invite state
    IF v_invite_status IS NULL THEN
        RAISE NOTICE 'Invite not found';
        RETURN FALSE;
    END IF;

    IF v_invite_status != 'pending' THEN
        RAISE NOTICE 'Invite already %', v_invite_status;
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
    -- Mark invite as accepted
    UPDATE household_invites
    SET status = 'accepted'
    WHERE id = p_invite_id;

    -- Link user to household
    UPDATE users
    SET 
        household_id = p_household_id,
        is_household_admin = FALSE
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected = 0 THEN
        -- Should not happen if user exists, but acts as safety
        RAISE EXCEPTION 'User not found';
    END IF;

    -- If we get here, transaction commits automatically
    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically on exception
        RAISE NOTICE 'Transaction failed: %', SQLERRM;
        RETURN FALSE;
END;
$$;
