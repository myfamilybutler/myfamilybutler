/**
 * Message Deduplication with Atomic Operations
 * 
 * Uses database unique constraints for atomic deduplication.
 * Handles edge cases and provides better error recovery.
 */

import type { MessagingChannel } from './types';
import { getAdminClient } from '@/lib/supabase';
import { log, logError } from '@/lib/utils/logger';

const DEDUP_WINDOW_MINUTES = 15;

/**
 * Check if a message has already been processed
 * Uses atomic INSERT with conflict detection
 * 
 * @returns true if message is a duplicate, false if new
 */
export async function isMessageProcessed(
  messageId: string, 
  channel: MessagingChannel
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + DEDUP_WINDOW_MINUTES);

    // Attempt to insert - unique constraint prevents duplicates
    const { error } = await admin
      .from('processed_messages')
      .insert({
        message_id: messageId,
        channel,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      // Check for unique constraint violation (PostgreSQL error code 23505)
      if (error.code === '23505') {
        log.info(`[Dedup] Duplicate message detected: ${messageId}`);
        return true;
      }

      // Log other errors but don't block processing
      logError('[Dedup] Database error:', error);
      
      // On error, check if message exists to be safe
      const { data, error: checkError } = await admin
        .from('processed_messages')
        .select('message_id')
        .eq('message_id', messageId)
        .eq('channel', channel)
        .maybeSingle();

      if (checkError) {
        logError('[Dedup] Check error:', checkError);
        // Fail safe - treat as duplicate to avoid double side effects
        return true;
      }

      return data !== null;
    }

    // Insert successful - message is new
    return false;
  } catch (err) {
    logError('[Dedup] Unexpected error:', err);
    // Fail safe on unexpected errors
    return true;
  }
}

/**
 * Mark a message as processed after it has been handled successfully.
 * This should be called only after side effects are committed so retries of
 * a failed attempt are not silently dropped.
 */
export async function markMessageProcessed(
  messageId: string,
  channel: MessagingChannel
): Promise<void> {
  try {
    await isMessageProcessed(messageId, channel);
  } catch (err) {
    logError('[Dedup] Failed to mark message as processed:', err);
  }
}
