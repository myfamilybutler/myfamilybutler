-- Deduplicate inbound/outbound messages by their provider message id.
-- This prevents retries (e.g. Inngest retries of the same webhook delivery)
-- from creating duplicate rows in public.messages.
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_id_unique
  ON public.messages (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
