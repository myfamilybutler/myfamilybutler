/**
 * WhatsApp Channel Adapter - Phase 1.4
 * 
 * Implements the ChannelAdapter interface for WhatsApp Cloud API.
 * Normalizes WhatsApp messages to StandardMessage format.
 */

import type {
  ChannelAdapter,
  StandardMessage,
  StandardResponse,
  ChannelMetadata,
  ChannelPayload,
  SendResult,
  MediaReference,
  MessageType,
} from '@/lib/core/types';
import type { MetaWebhookBody, MetaMessage } from '@/types';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { verifyWhatsAppSignature } from '@/lib/utils/security';
import { log, logError } from '@/lib/utils/logger';
import { assertDownloadedMediaIsSafe } from '@/lib/utils/media';
import {
  sendWhatsAppMessage,
  sendInteractiveMessage,
  sendMessageWithUrlButton,
  markMessageAsRead,
} from './send';

// ===========================================
// WhatsApp Adapter Implementation
// ===========================================

class WhatsAppAdapter implements ChannelAdapter {
  name = 'whatsapp' as const;
  displayName = 'WhatsApp';
  
  isEnabled(): boolean {
    return isProviderEnabled('whatsapp_business');
  }
  
  validateSignature(rawBody: string, signature: string | null): boolean {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    
    if (!appSecret) {
      if (process.env.NODE_ENV === 'production') {
        logError('[WhatsApp] CRITICAL: WHATSAPP_APP_SECRET not set');
        return false;
      }
      // Allow in development
      log.warn('[WhatsApp] DEV MODE: Skipping signature verification');
      return true;
    }
    
    return verifyWhatsAppSignature(rawBody, signature, appSecret);
  }
  
  async parseIncoming(payload: unknown): Promise<Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null> {
    const body = payload as MetaWebhookBody;
    
    if (body.object !== 'whatsapp_business_account') {
      return null;
    }
    
    // Find the first message in the webhook
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        
        const messages = change.value.messages;
        const contacts = change.value.contacts;
        
        if (!messages || messages.length === 0) continue;
        
        const message = messages[0];
        const contact = contacts?.[0];
        
        return this.normalizeMessage(message, contact);
      }
    }
    
    return null;
  }
  
  private normalizeMessage(
    message: MetaMessage,
    contact?: { profile: { name: string }; wa_id: string }
  ): Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null {
    const phoneNumber = message.from;
    const messageId = message.id;
    const contactName = contact?.profile?.name;
    
    // Determine message type and extract content
    let type: MessageType;
    let content: string | null = null;
    let mediaRef: MediaReference | null = null;
    
    switch (message.type) {
      case 'text':
        type = 'text';
        content = message.text?.body || '';
        break;
        
      case 'image':
        type = 'image';
        content = message.image?.caption || null;
        mediaRef = {
          id: message.image!.id,
          mimeType: message.image!.mime_type,
          caption: message.image?.caption,
        };
        break;
        
      case 'audio':
        type = 'voice';
        mediaRef = {
          id: message.audio!.id,
          mimeType: message.audio!.mime_type,
        };
        break;
        
      case 'video':
        type = 'video';
        content = message.video?.caption || null;
        mediaRef = {
          id: message.video!.id,
          mimeType: message.video!.mime_type,
          caption: message.video?.caption,
        };
        break;
        
      case 'document':
        type = 'document';
        mediaRef = {
          id: message.document!.id,
          mimeType: message.document!.mime_type,
          filename: message.document?.filename,
        };
        break;
        
      case 'interactive':
        type = 'interactive';
        // Extract button/list reply as content
        if (message.interactive?.button_reply) {
          content = message.interactive.button_reply.id;
        } else if (message.interactive?.list_reply) {
          content = message.interactive.list_reply.id;
        }
        break;
        
      default:
        // Unsupported message type
        return null;
    }
    
    return {
      id: messageId,
      channel: 'whatsapp',
      type,
      content,
      mediaRef,
      replyTo: null, // WhatsApp doesn't provide this in basic webhook
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      metadata: {
        channel: 'whatsapp',
        recipientId: phoneNumber,
        senderId: phoneNumber,
        originalMessageId: messageId,
        contactName,
      },
    };
  }
  
  formatResponse(response: StandardResponse): ChannelPayload {
    // WhatsApp payload is constructed in send methods
    return response;
  }
  
  async send(metadata: ChannelMetadata, payload: ChannelPayload): Promise<SendResult> {
    const response = payload as StandardResponse;
    return this.sendResponse(metadata, response);
  }
  
  async sendResponse(metadata: ChannelMetadata, response: StandardResponse): Promise<SendResult> {
    const phoneNumber = metadata.recipientId;
    
    try {
      // Priority: URL button > Quick replies > Plain text
      if (response.urlButton) {
        const result = await sendMessageWithUrlButton(
          phoneNumber,
          response.text,
          { title: response.urlButton.title, url: response.urlButton.url }
        );
        return result;
      }
      
      if (response.buttons && response.buttons.length > 0) {
        const result = await sendInteractiveMessage(
          phoneNumber,
          response.text,
          response.buttons.map(b => ({ id: b.id, title: b.title }))
        );
        return result;
      }
      
      // Plain text
      const result = await sendWhatsAppMessage(phoneNumber, response.text);
      return result;
    } catch (error) {
      logError('[WhatsApp] Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async markAsRead(messageId: string): Promise<void> {
    await markMessageAsRead(messageId);
  }
  
  async downloadMedia(mediaRef: MediaReference): Promise<Buffer> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('Missing WHATSAPP_ACCESS_TOKEN');
    }
    
    // Step 1: Get media URL from Meta
    const infoResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaRef.id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!infoResponse.ok) {
      throw new Error(`Failed to get media info: ${infoResponse.status}`);
    }
    
    const info = await infoResponse.json() as { url: string };
    
    // Step 2: Download media
    const mediaResponse = await fetch(info.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status}`);
    }
    
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = assertDownloadedMediaIsSafe(buffer, mediaRef.mimeType || 'application/octet-stream');
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return buffer;
  }
}

// Export singleton instance
export const whatsappAdapter = new WhatsAppAdapter();

