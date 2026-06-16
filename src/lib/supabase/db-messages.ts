/**
 * Message Database Operations
 */
import type { Message } from '@/types';
import { getAdminClient } from './client';
import { logError } from '@/lib/utils/logger';

/**
 * Log a message to the database
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
  
  const { data, error } = await admin
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    logError('Error fetching message history:', error);
    return [];
  }
  
  // Return in chronological order (oldest first)
  return (data?.reverse() ?? []) as Message[];
}
