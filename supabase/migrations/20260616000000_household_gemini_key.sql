-- ===========================================
-- Add gemini_api_key column to households table
-- ===========================================

ALTER TABLE public.households ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL;

COMMENT ON COLUMN public.households.gemini_api_key IS 'Stores the custom Gemini API key for the household to support the BYOK model';
