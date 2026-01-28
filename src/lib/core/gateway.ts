/**
 * Message Gateway - Phase 1.2
 * 
 * Single entry point for all incoming messages from all channels.
 * Handles:
 * - Provider enable/disable checks
 * - Rate limiting
 * - Deduplication
 * - Identity resolution
 * - Routes to Pipeline for processing
 */

import type {
  StandardMessage,
  StandardResponse,
  ChannelAdapter,
  GatewayOptions,
  GatewayResult,
  MessagingChannel,
  LoggableMessageType,
} from './types';
import { pipeline } from './pipeline';
import { getConversationState } from './state';
import { findOrCreateUser } from '@/lib/supabase/identity';
import { isMessageProcessed } from './dedup';
import { checkRateLimit } from './rate-limit';
import { getFamilyMembers, logMessage } from '@/lib/supabase';
import { getTemplate } from '@/lib/ai/response-templates';
import type { Channel } from './types';

// ===========================================
// Rate Limiting (DB-backed)
// ===========================================

// ===========================================
// Gateway Class
// ===========================================

class MessageGateway {
  private adapters: Map<Channel, ChannelAdapter> = new Map();
  
  /**
   * Register a channel adapter
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);
    console.log(`[Gateway] Registered adapter: ${adapter.displayName}`);
  }
  
  /**
   * Get adapter for a channel
   */
  getAdapter(channel: Channel): ChannelAdapter | undefined {
    return this.adapters.get(channel);
  }
  
  /**
   * Process incoming message from any channel
   * 
   * This is the SINGLE entry point for all message processing.
   */
  async processMessage(
    channel: Channel,
    rawPayload: unknown,
    rawBody: string,
    signature: string | null,
    options: GatewayOptions = {}
  ): Promise<GatewayResult> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    console.log(`[Gateway:${requestId}] Processing ${channel} message`);
    
    // Step 1: Get adapter
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      console.error(`[Gateway:${requestId}] No adapter for channel: ${channel}`);
      return { processed: false, reason: 'error' };
    }
    
    // Step 2: Check if provider is enabled
    if (!adapter.isEnabled()) {
      console.log(`[Gateway:${requestId}] Provider disabled: ${channel}`);
      return { processed: false, reason: 'provider_disabled' };
    }
    
    // Step 3: Validate signature
    if (!adapter.validateSignature(rawBody, signature)) {
      console.error(`[Gateway:${requestId}] Invalid signature for ${channel}`);
      return { processed: false, reason: 'error' };
    }
    
    // Step 4: Parse incoming message
    const partialMessage = await adapter.parseIncoming(rawPayload);
    if (!partialMessage) {
      console.log(`[Gateway:${requestId}] No processable message in payload`);
      return { processed: false, reason: 'invalid_message' };
    }
    
    // Step 5: Deduplication check
    if (!options.skipDedup) {
      // Only check dedup for messaging channels
      const messagingChannel = channel as MessagingChannel;
      const isDuplicate = await isMessageProcessed(partialMessage.id, messagingChannel);
      if (isDuplicate) {
        console.log(`[Gateway:${requestId}] Duplicate message: ${partialMessage.id}`);
        return { processed: false, reason: 'duplicate' };
      }
    }
    
    // Step 6: Identity resolution
    const identityResult = await findOrCreateUser({
      phone: partialMessage.metadata.senderId,
      telegramChatId: partialMessage.metadata.telegramChatId?.toString(),
      channel: channel as 'whatsapp' | 'telegram' | '360dialog',
      verifyPhone: true, // Implicit verification - messaging from this number
    });
    
    if (!identityResult.user) {
      console.error(`[Gateway:${requestId}] Failed to resolve identity`);
      // Send error response
      await adapter.sendResponse(partialMessage.metadata, {
        text: getTemplate('identityError', 'de'),
        metadata: { language: 'de', shouldLog: false },
      });
      return { processed: false, reason: 'error' };
    }
    
    const user = identityResult.user;
    
    // Step 7: Rate limiting check
    if (!options.skipRateLimit && !(await checkRateLimit(`gateway:${user.id}`))) {
      const rateLimitResponse: StandardResponse = {
        text: getTemplate('rateLimitReached', 'de'),
        metadata: { language: 'de', shouldLog: false },
      };
      await adapter.sendResponse(partialMessage.metadata, rateLimitResponse);
      return { processed: false, reason: 'rate_limited' };
    }
    
    // Step 8: Get family members for AI context
    let familyMembers: string[] = [];
    if (user.household_id) {
      const { users: householdUsers, familyMembers: members } = await getFamilyMembers(user.household_id);
      familyMembers = [
        ...householdUsers.filter(u => u.display_name).map(u => u.display_name!),
        ...members.map(m => m.name),
      ];
    }
    
    // Step 9: Build complete StandardMessage
    const message: StandardMessage = {
      ...partialMessage,
      userId: user.id,
      householdId: user.household_id || null,
      familyMembers,
      isNewUser: identityResult.isNewUser,
      wasIdentityLinked: identityResult.wasLinked,
    };
    
    // Step 10: Get conversation state
    const conversationState = await getConversationState(user.id, channel);
    
    // Step 11: Mark as read (non-blocking)
    if (adapter.markAsRead) {
      adapter.markAsRead(message.id).catch(() => {});
    }
    
    // Step 12: Log user message
    const loggableType: LoggableMessageType = 
      message.type === 'voice' ? 'voice' : 
      message.type === 'image' ? 'image' : 'text';
    const loggableChannel = (['whatsapp', 'telegram', '360dialog'].includes(channel) 
      ? channel 
      : undefined) as MessagingChannel | undefined;
    
    await logMessage(
      user.id,
      'user',
      message.content || `[${message.type}]`,
      loggableType,
      message.id,
      loggableChannel
    );
    
    // Step 13: Process through pipeline
    const pipelineResult = await pipeline.process({
      message,
      conversationState,
      startTime,
      requestId,
    });
    
    // Step 14: Send response
    if (pipelineResult.response && !pipelineResult.response.metadata?.skipSend) {
      const sendResult = await adapter.sendResponse(message.metadata, pipelineResult.response);
      
      // Log assistant message
      if (sendResult.success && pipelineResult.response.metadata?.shouldLog !== false) {
        await logMessage(
          user.id,
          'assistant',
          pipelineResult.response.text,
          'text',
          sendResult.messageId,
          loggableChannel
        );
      }
    }
    
    console.log(`[Gateway:${requestId}] Completed in ${Date.now() - startTime}ms`);
    
    return {
      processed: true,
      pipelineResult,
      response: pipelineResult.response,
    };
  }
}

// Singleton instance
export const gateway = new MessageGateway();
