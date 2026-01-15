/**
 * WhatsApp Media Processing
 * 
 * Uses the unified media processor for all media types.
 * This file just provides WhatsApp-specific wrapping (download, send responses).
 */

import { sendWhatsAppMessage } from './send';
import { whatsappAdapter } from './adapter';
import { logMessage } from '@/lib/supabase';
import { processMedia, isSupportedMediaType, getSupportedTypesDescription } from '@/lib/media';
import { 
  handleBrainResult,
  MESSAGES,
  logAssistantMessage,
  type MediaResult,
  type MessageSender,
} from '../base/media-handler';
import type { MediaReference } from '@/lib/core/types';

// ===========================================
// Types
// ===========================================

interface WhatsAppMediaContext {
  userId: string;
  householdId: string | null;
  phoneNumber: string;
  messageId: string;
  familyMembers?: string[];
}

// ===========================================
// WhatsApp Message Sender
// ===========================================

function createWhatsAppSender(phoneNumber: string): MessageSender {
  return {
    send: async (text: string) => {
      await sendWhatsAppMessage(phoneNumber, text);
    },
  };
}

// ===========================================
// Unified Media Processing
// ===========================================

/**
 * Process any media message through the unified processor
 * 
 * This is the single entry point for all WhatsApp media:
 * - Images
 * - Voice messages
 * - Documents (PDF, Word, Excel, etc.)
 */
export async function processMediaMessage(
  mediaRef: MediaReference,
  context: WhatsAppMediaContext
): Promise<MediaResult> {
  const { userId, phoneNumber, householdId, messageId, familyMembers } = context;
  const inputType = mediaRef.mimeType.startsWith('audio/') ? 'voice' 
    : mediaRef.mimeType.startsWith('image/') ? 'image' 
    : 'document';
  
  console.log(`[WhatsApp Media] Processing ${inputType} for user ${userId}`);
  
  // Log the incoming media
  const logContent = inputType === 'voice' ? '[Sprachnachricht]' 
    : inputType === 'image' ? (mediaRef.caption || '[Bild empfangen]')
    : `[Dokument: ${mediaRef.filename || 'Datei'}]`;
  await logMessage(userId, 'user', logContent, inputType === 'document' ? 'text' : inputType, messageId);
  
  // Check if user has a household
  if (!householdId) {
    const msg = MESSAGES[inputType === 'image' ? 'image' : 'voice'].noFamily;
    await sendWhatsAppMessage(phoneNumber, msg);
    return { handled: true, eventsCreated: 0 };
  }
  
  // Check if type is supported
  if (!isSupportedMediaType(mediaRef.mimeType)) {
    const msg = `❌ Nicht unterstützter Dateityp. Unterstützt: ${getSupportedTypesDescription()}`;
    await sendWhatsAppMessage(phoneNumber, msg);
    await logAssistantMessage(userId, msg);
    return { handled: true, eventsCreated: 0 };
  }
  
  // Send processing indicator
  const processingMsg = inputType === 'voice' ? MESSAGES.voice.processing
    : inputType === 'image' ? '🖼️ Bild wird analysiert...'
    : '📄 Dokument wird analysiert...';
  await sendWhatsAppMessage(phoneNumber, processingMsg);
  
  // Download media using adapter
  let buffer: Buffer;
  try {
    buffer = await whatsappAdapter.downloadMedia(mediaRef);
    console.log(`[WhatsApp Media] Downloaded ${buffer.length} bytes`);
  } catch (error) {
    console.error('[WhatsApp Media] Download error:', error);
    const errorMsg = '❌ Konnte die Datei nicht herunterladen. Bitte versuche es erneut.';
    await sendWhatsAppMessage(phoneNumber, errorMsg);
    await logAssistantMessage(userId, errorMsg);
    return { handled: true, eventsCreated: 0 };
  }
  
  // Process through unified media processor
  const result = await processMedia(
    {
      buffer,
      mimeType: mediaRef.mimeType,
      filename: mediaRef.filename,
      caption: mediaRef.caption,
    },
    {
      userId,
      householdId,
      messageId,
      familyMembers,
    }
  );
  
  // Use shared handler for response formatting
  const sender = createWhatsAppSender(phoneNumber);
  return handleBrainResult(result, { userId, householdId, messageId, familyMembers }, inputType, sender);
}

// ===========================================
// Legacy Functions (for backward compatibility)
// ===========================================

/**
 * @deprecated Use processMediaMessage instead
 */
export async function processImageMessage(
  mediaId: string,
  mimeType: string,
  caption: string | undefined,
  context: WhatsAppMediaContext
): Promise<MediaResult> {
  return processMediaMessage(
    { id: mediaId, mimeType, caption },
    context
  );
}

/**
 * @deprecated Use processMediaMessage instead
 */
export async function processVoiceMessage(
  mediaId: string,
  mimeType: string,
  context: WhatsAppMediaContext
): Promise<MediaResult> {
  return processMediaMessage(
    { id: mediaId, mimeType },
    context
  );
}

/**
 * @deprecated Use processMediaMessage instead
 */
export async function processDocumentMessage(
  mediaId: string,
  mimeType: string,
  filename: string | undefined,
  context: WhatsAppMediaContext
): Promise<MediaResult> {
  return processMediaMessage(
    { id: mediaId, mimeType, filename },
    context
  );
}
