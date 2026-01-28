/**
 * Persistent message deduplication (DB-backed)
 */
import type { MessagingChannel } from './types';
import { getAdminClient } from '@/lib/supabase';

export async function isMessageProcessed(messageId: string, channel: MessagingChannel): Promise<boolean> {
  const admin = getAdminClient();

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  const { error } = await admin
    .from('processed_messages')
    .insert({
      message_id: messageId,
      channel,
      expires_at: expiresAt.toISOString(),
    });

  if (error && error.code === '23505') {
    return true;
  }

  return false;
}
