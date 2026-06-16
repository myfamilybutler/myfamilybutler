/**
 * Dead Letter Queue for Failed Jobs
 * 
 * Stores failed jobs for later inspection and retry.
 */

import { getAdminClient } from '@/lib/supabase';
import { logError } from '@/lib/utils/logger';

export interface DeadLetterEntry {
  id?: string;
  job_type: string;
  payload: Record<string, unknown>;
  error_message: string;
  error_stack?: string;
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processed' | 'failed_permanently';
  message_id?: string;
  channel?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

/**
 * Add a failed job to the dead letter queue.
 *
 * When `messageId` and `channel` are provided, the insert becomes an upsert on
 * `(message_id, channel)` so retries of the same logical failure do not create
 * multiple DLQ rows.
 */
export async function addToDeadLetterQueue(
  jobType: string,
  payload: Record<string, unknown>,
  error: Error,
  retryCount: number,
  maxRetries: number,
  messageId?: string,
  channel?: string
): Promise<void> {
  const admin = getAdminClient();

  try {
    if (messageId && channel) {
      // Preserve the original error context from the first failure. Retries of
      // the same message should update the retry bookkeeping without overwriting
      // the initial error message/stack.
      const { data: existing } = await admin
        .from('dead_letter_queue')
        .select('id, error_message, error_stack, payload, retry_count, created_at')
        .eq('message_id', messageId)
        .eq('channel', channel)
        .maybeSingle();

      if (existing) {
        const nextRetryCount = Math.max(existing.retry_count ?? 0, retryCount);
        const { error: updateError } = await admin
          .from('dead_letter_queue')
          .update({
            retry_count: nextRetryCount,
            max_retries: maxRetries,
            status: nextRetryCount >= maxRetries ? 'failed_permanently' : 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          logError('[DeadLetter] Failed to update existing DLQ entry:', updateError);
        }
        return;
      }
    }

    const row = {
      job_type: jobType,
      payload,
      error_message: error.message,
      error_stack: error.stack,
      retry_count: retryCount,
      max_retries: maxRetries,
      status: retryCount >= maxRetries ? 'failed_permanently' : 'pending',
      message_id: messageId ?? null,
      channel: channel ?? null,
    };

    await admin.from('dead_letter_queue').insert(row);

    logError(`[DeadLetter] Added ${jobType} job to DLQ:`, error.message);
  } catch (dlqError) {
    // If DLQ itself fails, log to console as last resort
    logError('[DeadLetter] Failed to add to DLQ:', dlqError);
    logError('Original error:', error);
  }
}

/**
 * Get pending items from dead letter queue
 */
export async function getPendingDeadLetters(
  limit: number = 100
): Promise<DeadLetterEntry[]> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('dead_letter_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logError('[DeadLetter] Error fetching pending items:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark a dead letter item as processed
 */
export async function markDeadLetterProcessed(id: string): Promise<void> {
  const admin = getAdminClient();

  await admin
    .from('dead_letter_queue')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Mark a dead letter item as permanently failed
 */
export async function markDeadLetterFailed(id: string): Promise<void> {
  const admin = getAdminClient();

  await admin
    .from('dead_letter_queue')
    .update({
      status: 'failed_permanently',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}
