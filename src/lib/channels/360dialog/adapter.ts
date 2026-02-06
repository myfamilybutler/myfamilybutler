/**
 * 360dialog Channel Adapter
 *
 * Normalizes 360dialog webhook payloads to StandardMessage format.
 */

import { timingSafeEqual } from 'crypto';
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
import { isProviderEnabled } from '@/lib/channels/providers.config';
import {
  send360DialogMessage,
  send360DialogInteractiveMessage,
  send360DialogMessageWithUrlButton,
  mark360DialogMessageAsRead,
  download360DialogMedia,
} from './send';

interface D360Message {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive';
  text?: { body: string };
  image?: { caption?: string; mime_type: string; id: string };
  audio?: { mime_type: string; id: string };
  video?: { caption?: string; mime_type: string; id: string };
  document?: { mime_type: string; id: string; filename?: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

interface D360Contact {
  profile?: { name?: string };
  wa_id: string;
}

interface D360WebhookBody {
  object: 'whatsapp_business_account';
  entry?: Array<{
    changes?: Array<{
      value: {
        contacts?: D360Contact[];
        messages?: D360Message[];
      };
      field: 'messages';
    }>;
  }>;
}

class Dialog360Adapter implements ChannelAdapter {
  name = '360dialog' as const;
  displayName = '360dialog';

  isEnabled(): boolean {
    return isProviderEnabled('360dialog');
  }

  validateSignature(_rawBody: string, signature: string | null): boolean {
    const apiKey = process.env.D360_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[360dialog] CRITICAL: D360_API_KEY not set');
        return false;
      }
      return true;
    }

    if (!signature) {
      return false;
    }

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(apiKey));
    } catch {
      return false;
    }
  }

  async parseIncoming(
    payload: unknown
  ): Promise<Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null> {
    const body = payload as D360WebhookBody;

    if (body.object !== 'whatsapp_business_account') {
      return null;
    }

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
    message: D360Message,
    contact?: D360Contact
  ): Omit<StandardMessage, 'userId' | 'householdId' | 'familyMembers' | 'isNewUser' | 'wasIdentityLinked'> | null {
    const phoneNumber = message.from;
    const messageId = message.id;
    const contactName = contact?.profile?.name;

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
          id: message.image?.id || '',
          mimeType: message.image?.mime_type || 'image/jpeg',
          caption: message.image?.caption,
        };
        break;

      case 'audio':
        type = 'voice';
        mediaRef = {
          id: message.audio?.id || '',
          mimeType: message.audio?.mime_type || 'audio/ogg',
        };
        break;

      case 'video':
        type = 'video';
        content = message.video?.caption || null;
        mediaRef = {
          id: message.video?.id || '',
          mimeType: message.video?.mime_type || 'video/mp4',
          caption: message.video?.caption,
        };
        break;

      case 'document':
        type = 'document';
        mediaRef = {
          id: message.document?.id || '',
          mimeType: message.document?.mime_type || 'application/octet-stream',
          filename: message.document?.filename,
        };
        break;

      case 'interactive':
        type = 'interactive';
        if (message.interactive?.button_reply) {
          content = message.interactive.button_reply.id;
        } else if (message.interactive?.list_reply) {
          content = message.interactive.list_reply.id;
        }
        break;

      default:
        return null;
    }

    if (mediaRef && !mediaRef.id) {
      return null;
    }

    return {
      id: messageId,
      channel: '360dialog',
      type,
      content,
      mediaRef,
      replyTo: null,
      timestamp: new Date(parseInt(message.timestamp, 10) * 1000),
      metadata: {
        channel: '360dialog',
        recipientId: phoneNumber,
        senderId: phoneNumber,
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
    const phoneNumber = metadata.recipientId;

    try {
      if (response.urlButton) {
        return await send360DialogMessageWithUrlButton(phoneNumber, response.text, {
          title: response.urlButton.title,
          url: response.urlButton.url,
        });
      }

      if (response.buttons && response.buttons.length > 0) {
        return await send360DialogInteractiveMessage(
          phoneNumber,
          response.text,
          response.buttons.map(b => ({ id: b.id, title: b.title }))
        );
      }

      return await send360DialogMessage(phoneNumber, response.text);
    } catch (error) {
      console.error('[360dialog] Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    await mark360DialogMessageAsRead(messageId);
  }

  async downloadMedia(mediaRef: MediaReference): Promise<Buffer> {
    return download360DialogMedia(mediaRef.id);
  }
}

export const dialog360Adapter = new Dialog360Adapter();
