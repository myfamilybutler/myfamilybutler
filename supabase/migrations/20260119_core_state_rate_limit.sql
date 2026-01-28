-- Migration: Core State + Rate Limiting

-- Conversation state (persistent)
CREATE TABLE IF NOT EXISTS public.conversation_state (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    state TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_expires ON public.conversation_state(expires_at);

ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.conversation_state
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Rate limiting (simple fixed window)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON public.rate_limits(expires_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
