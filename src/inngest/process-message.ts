/**
 * Queue-Based Message Processing - Phase 4.4
 * 
 * Uses Inngest for async message processing.
 * Benefits:
 * - Webhook responds quickly (<100ms)
 * - Processing happens asynchronously
 * - Automatic retries on failure
 * - Rate limiting built-in
 */

import { inngest } from '@/lib/inngest';
import { gateway } from '@/lib/core';
import { whatsappAdapter } from '@/lib/channels/whatsapp/adapter';
import { telegramAdapter } from '@/lib/channels/telegram/adapter';
import type { Channel } from '@/lib/core/types';

// ===========================================
// Register Adapters
// ===========================================

// Register adapters with gateway on module load
gateway.registerAdapter(whatsappAdapter);
gateway.registerAdapter(telegramAdapter);

// ===========================================
// Message Processing Job
// ===========================================

/**
 * Inngest function to process incoming messages
 * 
 * Triggered when a message is enqueued by the webhook.
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
    const { channel, payload, rawBody, signature } = event.data as {
      channel: Channel;
      payload: unknown;
      rawBody: string;
      signature: string | null;
    };
    
    console.log(`[Inngest] Processing ${channel} message`);
    
    // Process through gateway
    const result = await step.run('process-via-gateway', async () => {
      return gateway.processMessage(
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
  };
}

// ===========================================
// Helper: Enqueue Message
// ===========================================

/**
 * Enqueue a message for async processing
 * Call this from webhooks instead of processing directly
 */
export async function enqueueMessage(
  channel: Channel,
  payload: unknown,
  rawBody: string,
  signature: string | null
): Promise<{ queued: boolean }> {
  try {
    await inngest.send({
      name: 'message/received',
      data: {
        channel,
        payload,
        rawBody,
        signature,
        receivedAt: new Date().toISOString(),
      },
    });
    
    return { queued: true };
  } catch (error) {
    console.error('[Inngest] Failed to enqueue message:', error);
    return { queued: false };
  }
}
