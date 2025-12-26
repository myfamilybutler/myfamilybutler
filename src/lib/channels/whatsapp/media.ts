/**
 * WhatsApp Media Intent Processing
 * 
 * Handles processing of image and voice messages through the unified Brain.
 * Uses shared base handler for common logic.
 */

import { sendWhatsAppMessage } from './send';
import { logMessage } from '@/lib/supabase';
import { processImageInput, processVoiceInput } from '@/lib/ai';
import { 
  handleBrainResult,
  MESSAGES,
  type MediaContext,
  type MediaResult,
  type MessageSender,
} from '../base/media-handler';

// ===========================================
// Types
// ===========================================

interface WhatsAppMediaContext extends MediaContext {
  phoneNumber: string;
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
// Main Media Processing Functions
// ===========================================

/**
 * Process a WhatsApp image message through the Brain
 */
export async function processImageMessage(
  mediaId: string,
  mimeType: string,
  caption: string | undefined,
  context: WhatsAppMediaContext
): Promise<MediaResult> {
  const { userId, phoneNumber, householdId, messageId, familyMembers } = context;
  
  console.log(`[WhatsApp Media] Processing image ${mediaId} for user ${userId}`);
  
  if (!householdId) {
    await sendWhatsAppMessage(phoneNumber, MESSAGES.image.noFamily);
    return { handled: true, eventsCreated: 0 };
  }
  
  // Log the incoming image
  await logMessage(userId, 'user', caption || '[Bild empfangen]', 'image', messageId);
  
  // Process through Brain
  const result = await processImageInput(mediaId, userId, householdId, {
    mimeType,
    familyMembers,
    phoneNumber,
    messageId,
  });
  
  // Use shared handler with WhatsApp sender
  const sender = createWhatsAppSender(phoneNumber);
  return handleBrainResult(result, context, 'image', sender);
}

/**
 * Process a WhatsApp voice message through the Brain
 */
export async function processVoiceMessage(
  mediaId: string,
  mimeType: string,
  context: WhatsAppMediaContext
): Promise<MediaResult> {
  const { userId, phoneNumber, householdId, messageId, familyMembers } = context;
  
  console.log(`[WhatsApp Media] Processing voice ${mediaId} for user ${userId}`);
  
  // Log the incoming voice message
  await logMessage(userId, 'user', '[Sprachnachricht]', 'voice', messageId);
  
  // Send processing indicator
  await sendWhatsAppMessage(phoneNumber, MESSAGES.voice.processing);
  
  if (!householdId) {
    await sendWhatsAppMessage(phoneNumber, MESSAGES.voice.noFamily);
    return { handled: true, eventsCreated: 0 };
  }
  
  // Process through Brain
  const result = await processVoiceInput(mediaId, userId, householdId, {
    mimeType,
    familyMembers,
    phoneNumber,
    messageId,
  });
  
  // Use shared handler with WhatsApp sender
  const sender = createWhatsAppSender(phoneNumber);
  return handleBrainResult(result, context, 'voice', sender);
}
