/**
 * Message Database Operations
 */
import type { Message } from '@/types';
import { getAdminClient } from './client';
import { logError } from '@/lib/utils/logger';

/**
 * Log a message to the database.
 *
 * If a provider message id is supplied, the insert is idempotent: an existing
 * row is returned instead of creating a duplicate. This keeps retries of the
 * same webhook delivery (e.g. Inngest retries) from polluting the history.
 */
export async function logMessage(
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  type: 'text' | 'image' | 'voice' = 'text',
  messageId?: string,
  channel: 'whatsapp' | 'telegram' | '360dialog' = 'whatsapp'
): Promise<Message | null> {
  const admin = getAdminClient();

  // Idempotency: return an existing message row for the same provider id.
  if (messageId) {
    const { data: existing, error: checkError } = await admin
      .from('messages')
      .select('*')
      .eq('whatsapp_message_id', messageId)
      .maybeSingle();

    if (checkError) {
      logError('Error checking existing message:', checkError);
    } else if (existing) {
      return existing as Message;
    }
  }

  const { data, error } = await admin
    .from('messages')
    .insert({
      user_id: userId,
      role,
      content,
      type,
      whatsapp_message_id: messageId,
      channel,
    })
    .select()
    .single();

  if (error) {
    // A duplicate key violation means a concurrent request already logged this
    // message; fetch and return the existing row so callers see the same data.
    if (error.code === '23505' && messageId) {
      const { data: existing } = await admin
        .from('messages')
        .select('*')
        .eq('whatsapp_message_id', messageId)
        .maybeSingle();
      if (existing) {
        return existing as Message;
      }
    }

    logError('Error logging message:', error);
    return null;
  }

  return data as Message;
}

/**
 * Get message history for a user
 */
export async function getMessageHistory(
  userId: string,
  limit: number = 20
): Promise<Message[]> {
  const admin = getAdminClient();
  const safeLimit = Math.min(Math.max(limit || 20, 1), 50);

  const { data, error } = await admin
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  
  if (error) {
    logError('Error fetching message history:', error);
    return [];
  }
  
  // Return in chronological order (oldest first)
  return (data?.reverse() ?? []) as Message[];
}
