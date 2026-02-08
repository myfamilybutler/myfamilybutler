-- ===========================================
-- Add color column to family_members table
-- Allows personalized color coding for calendar events
-- ===========================================

-- Add color column with default emerald-500 (existing system default)
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10b981';

-- Add comment for documentation
COMMENT ON COLUMN public.family_members.color IS 'HEX color code for calendar event display. Default is emerald (#10b981).';
