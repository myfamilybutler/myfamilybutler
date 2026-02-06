/**
 * Queue-Based Message Processing with Dead Letter Queue
 * 
 * Uses Inngest for async message processing with:
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
import { createHash } from 'crypto';

// ===========================================
// Register Adapters
// ===========================================

// Register adapters on module load
registerAdapter(whatsappAdapter);
registerAdapter(telegramAdapter);
registerAdapter(dialog360Adapter);

// ===========================================
// Message Processing Job
// ===========================================

/**
 * Inngest function to process incoming messages
 * 
 * Triggered when a message is enqueued by the webhook.
 * Implements dead letter queue handling and retries.
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
  signature: string | null
): Promise<{ queued: boolean; idempotencyKey: string }> {
  // Deterministic idempotency key based on channel + payload body
  // so retried webhook deliveries map to the same key.
  const idempotencyKey = createHash('sha256')
    .update(`${channel}:${rawBody}`)
    .digest('hex');
  
  try {
    await inngest.send({
      name: 'message/received',
      data: {
        channel,
        payload,
        rawBody,
        signature,
        receivedAt: new Date().toISOString(),
        idempotencyKey,
      },
    });
    
    return { queued: true, idempotencyKey };
  } catch (error) {
    console.error('[Inngest] Failed to enqueue message:', error);
    return { queued: false, idempotencyKey };
  }
}
