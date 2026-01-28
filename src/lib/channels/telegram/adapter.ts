/**
 * Telegram Channel Adapter - Phase 1.5
 * 
 * Implements the ChannelAdapter interface for Telegram Bot API.
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
import type { TelegramUpdate, TelegramMessage } from '@/types';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import {
  sendTelegramMessage,
  sendTelegramMessageWithUrlButton,
} from './send';

// ===========================================
// Telegram Adapter Implementation
// ===========================================

class TelegramAdapter implements ChannelAdapter {
  name = 'telegram' as const;
  displayName = 'Telegram';
  
  isEnabled(): boolean {
    return isProviderEnabled('telegram');
  }
  
  validateSignature(): boolean {
    // Telegram uses secret token in URL, validated at route level
    // For now, we trust the route-level validation
    return true;
  }
  
  async parseIncoming(payload: unknown): Promise<Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null> {
    const update = payload as TelegramUpdate;
    
    const message = update.message || update.edited_message;
    if (!message) {
      return null;
    }
    
    return this.normalizeMessage(message);
  }
  
  private normalizeMessage(
    message: TelegramMessage
  ): Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null {
    const chatId = message.chat.id;
    const messageId = message.message_id.toString();
    const contactName = message.from?.first_name;
    
    // Get phone number from contact if shared
    let phoneNumber: string | undefined;
    if (message.contact?.phone_number) {
      phoneNumber = message.contact.phone_number;
    }
    
    // Determine message type and extract content
    let type: MessageType;
    let content: string | null = null;
    let mediaRef: MediaReference | null = null;
    
    if (message.text) {
      type = 'text';
      content = message.text;
    } else if (message.photo && message.photo.length > 0) {
      type = 'image';
      content = message.caption || null;
      // Get largest photo
      const photo = message.photo[message.photo.length - 1];
      mediaRef = {
        id: photo.file_id,
        mimeType: 'image/jpeg', // Telegram always sends JPEG
      };
    } else if (message.voice) {
      type = 'voice';
      mediaRef = {
        id: message.voice.file_id,
        mimeType: message.voice.mime_type || 'audio/ogg',
      };
    } else if (message.document) {
      type = 'document';
      mediaRef = {
        id: message.document.file_id,
        mimeType: message.document.mime_type || 'application/octet-stream',
        filename: message.document.file_name,
      };
    } else if (message.contact) {
      type = 'text';
      content = `[Contact shared: ${message.contact.first_name} ${message.contact.phone_number}]`;
    } else {
      // Unsupported message type
      return null;
    }
    
    return {
      id: messageId,
      channel: 'telegram',
      type,
      content,
      mediaRef,
      replyTo: null,
      timestamp: new Date(message.date * 1000),
      metadata: {
        channel: 'telegram',
        recipientId: chatId.toString(),
        senderId: phoneNumber,
        telegramChatId: chatId,
        originalMessageId: messageId,
        contactName,
      },
    };
  }
  
  formatResponse(response: StandardResponse): ChannelPayload {
    return response;
  }
  
  async send(metadata: ChannelMetadata, payload: ChannelPayload): Promise<SendResult> {
    const response = payload as StandardResponse;
    return this.sendResponse(metadata, response);
  }
  
  async sendResponse(metadata: ChannelMetadata, response: StandardResponse): Promise<SendResult> {
    const chatId = metadata.telegramChatId;
    
    if (!chatId) {
      return {
        success: false,
        error: 'No Telegram chat ID',
      };
    }
    
    try {
      // URL button takes priority
      if (response.urlButton) {
        const result = await sendTelegramMessageWithUrlButton(
          chatId,
          response.text,
          { text: response.urlButton.title, url: response.urlButton.url }
        );
        return {
          success: result.success,
          messageId: result.messageId?.toString(),
        };
      }
      
      // Note: Telegram quick replies would use inline keyboards
      // For now, fall back to plain text
      
      const result = await sendTelegramMessage(chatId, response.text);
      return {
        success: result.success,
        messageId: result.messageId?.toString(),
      };
    } catch (error) {
      console.error('[Telegram] Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async downloadMedia(mediaRef: MediaReference): Promise<Buffer> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN');
    }
    
    // Step 1: Get file path from Telegram
    const fileResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${mediaRef.id}`
    );
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to get file info: ${fileResponse.status}`);
    }
    
    const fileData = await fileResponse.json() as { ok: boolean; result: { file_path: string } };
    
    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error('Failed to get file path from Telegram');
    }
    
    // Step 2: Download file
    const mediaResponse = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`,
      { signal: AbortSignal.timeout(30000) }
    );
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status}`);
    }
    
    const arrayBuffer = await mediaResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

// Export singleton instance
export const telegramAdapter = new TelegramAdapter();

