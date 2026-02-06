/**
 * Queue-Based Message Processing with Dead Letter Queue
 * 
 * Uses Inngest for async message processing with:
 * - Per-user message ordering (sequence numbers)
 * - Dead letter queue for failed jobs
 * - Idempotency keys for safe retries
 */

import { inngest } from '@/lib/inngest';
import { processMessage as processGatewayMessage, registerAdapter } from '@/lib/core/gateway';
import { whatsappAdapter } from '@/lib/channels/whatsapp/adapter';
import { telegramAdapter } from '@/lib/channels/telegram/adapter';
import { dialog360Adapter } from '@/lib/channels/360dialog/adapter';
import type { Channel } from '@/lib/core/types';
import { addToDeadLetterQueue } from '@/lib/core/dead-letter-queue';
import { getAdminClient } from '@/lib/supabase';

// ===========================================
// Register Adapters
// ===========================================

// Register adapters on module load
registerAdapter(whatsappAdapter);
registerAdapter(telegramAdapter);
registerAdapter(dialog360Adapter);

// ===========================================
// Message Sequence Tracking
// ===========================================

// Message sequence tracking for per-user ordering

const userSequenceNumbers = new Map<string, number>();

/**
 * Get next sequence number for a user (for ordering)
 */
async function getNextSequenceNumber(userId: string): Promise<number> {
  const admin = getAdminClient();
  
  // Use database for atomic sequence number generation
  const { data, error } = await admin.rpc('get_next_message_sequence', {
    p_user_id: userId,
  });
  
  if (error) {
    // Fallback to in-memory counter
    const current = userSequenceNumbers.get(userId) || 0;
    const next = current + 1;
    userSequenceNumbers.set(userId, next);
    return next;
  }
  
  return data || 1;
}

// ===========================================
// Message Processing Job
// ===========================================

/**
 * Inngest function to process incoming messages
 * 
 * Triggered when a message is enqueued by the webhook.
 * Implements per-user ordering and dead letter queue.
 */
export const processMessage = inngest.createFunction(
  {
    id: 'process-message',
    name: 'Process Incoming Message',
    retries: 3,
    // Rate limit: 100 messages per minute per channel
    rateLimit: {
      key: 'event.data.channel',
      limit: 100,
      period: '1m',
    },
  },
  { event: 'message/received' },
  async ({ event, step }) => {
    const { channel, payload, rawBody, signature, idempotencyKey } = event.data as {
      channel: Channel;
      payload: unknown;
      rawBody: string;
      signature: string | null;
      idempotencyKey?: string;
    };
    
    console.log(`[Inngest] Processing ${channel} message`);
    
    try {
      // Process through gateway
      const result = await step.run('process-via-gateway', async () => {
        return processGatewayMessage(
          channel,
          payload,
          rawBody,
          signature,
          { skipDedup: false, skipRateLimit: false }
        );
      });
      
      // Log result
      if (result.processed) {
        console.log(`[Inngest] Message processed: ${result.pipelineResult?.eventsCreated || 0} events created`);
      } else {
        console.log(`[Inngest] Message not processed: ${result.reason}`);
      }
      
      return result;
    } catch (error) {
      console.error('[Inngest] Message processing failed:', error);
      
      // Add to dead letter queue after all retries exhausted
      await addToDeadLetterQueue(
        'message_processing',
        { channel, payload: payload as Record<string, unknown>, idempotencyKey },
        error as Error,
        0,
        3
      );
      
      throw error; // Re-throw to trigger Inngest retry
    }
  }
);

// ===========================================
// Event Types
// ===========================================

export interface MessageReceivedEvent {
  name: 'message/received';
  data: {
    channel: Channel;
    payload: unknown;
    rawBody: string;
    signature: string | null;
    receivedAt: string;
    idempotencyKey?: string;
    sequenceNumber?: number;
  };
}

// ===========================================
// Helper: Enqueue Message
// ===========================================

/**
 * Enqueue a message for async processing
 * Call this from webhooks instead of processing directly
 * 
 * Implements idempotency keys for safe retries
 */
export async function enqueueMessage(
  channel: Channel,
  payload: unknown,
  rawBody: string,
  signature: string | null,
  userId?: string
): Promise<{ queued: boolean; idempotencyKey: string }> {
  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();
  
  try {
    // Get sequence number for ordering if userId provided
    let sequenceNumber: number | undefined;
    if (userId) {
      sequenceNumber = await getNextSequenceNumber(userId);
    }
    
    await inngest.send({
      name: 'message/received',
      data: {
        channel,
        payload,
        rawBody,
        signature,
        receivedAt: new Date().toISOString(),
        idempotencyKey,
        sequenceNumber,
      },
    });
    
    return { queued: true, idempotencyKey };
  } catch (error) {
    console.error('[Inngest] Failed to enqueue message:', error);
    return { queued: false, idempotencyKey };
  }
}
