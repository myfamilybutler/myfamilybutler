-- Add whatsapp_verified field to track actual WhatsApp connection
-- This follows the same pattern as telegram_chat_id for connection verification

-- Add boolean field (defaults to false for new users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT FALSE;

-- Backfill: Mark existing users who onboarded via WhatsApp as verified
UPDATE users 
SET whatsapp_verified = TRUE 
WHERE onboarding_source = 'whatsapp' AND whatsapp_verified IS NOT TRUE;

-- Add index for potential queries filtering by messaging channel access
CREATE INDEX IF NOT EXISTS idx_users_messaging_channels 
ON users (whatsapp_verified, telegram_chat_id) 
WHERE whatsapp_verified = TRUE OR telegram_chat_id IS NOT NULL;

COMMENT ON COLUMN users.whatsapp_verified IS 'Set to TRUE when user sends a message via WhatsApp webhook';
