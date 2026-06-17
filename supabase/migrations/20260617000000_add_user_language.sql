-- Migration to add language column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'de'));

-- Migrate existing users to 'de' if they have Austrian (+43), German (+49), Swiss (+41) phone numbers
UPDATE public.users 
SET language = 'de' 
WHERE phone_number LIKE '+43%' OR phone_number LIKE '+49%' OR phone_number LIKE '+41%';
