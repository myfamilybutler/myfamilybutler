/**
 * Telegram Media Intent Processing
 * 
 * Handles processing of voice messages through the unified Brain.
 * Uses shared base handler for common logic.
 */

import { sendTelegramMessage, downloadTelegramFile } from '@/lib/channels/telegram';
import { logMessage } from '@/lib/supabase';
import { processLocalAudio } from '@/actions/process-voice';
import { parseEventWithFallback } from '@/lib/ai';
import { 
  handleBrainResult,
  MESSAGES,
  MEDIA_CONFIG,
  type MediaContext,
  type MediaResult,
  type MessageSender,
} from './base-media-handler';
import type { BrainResult } from '@/lib/ai/types';

// ===========================================
// Types
// ===========================================

interface TelegramMediaContext extends MediaContext {
  chatId: number;
}

// ===========================================
// Telegram Message Sender
// ===========================================

function createTelegramSender(chatId: number): MessageSender {
  return {
    send: async (text: string) => {
      await sendTelegramMessage(chatId, text, { parseMode: 'Markdown' });
    },
  };
}

// ===========================================
// Voice Message Processing
// ===========================================

/**
 * Process a Telegram voice message through the Brain
 */
export async function processTelegramVoiceMessage(
  fileId: string,
  context: TelegramMediaContext
): Promise<MediaResult> {
  const { userId, chatId, householdId, messageId, familyMembers } = context;
  const sender = createTelegramSender(chatId);
  
  console.log(`[Telegram Media] Processing voice ${fileId} for user ${userId}`);
  
  // Log the incoming voice message
  await logMessage(userId, 'user', '[Sprachnachricht]', 'voice', messageId);
  
  // Send processing indicator
  await sendTelegramMessage(chatId, MESSAGES.voice.processing);
  
  if (!householdId) {
    await sendTelegramMessage(chatId, MESSAGES.voice.noFamily);
    return { handled: true, eventsCreated: 0 };
  }
  
  try {
    // Download audio from Telegram
    const audioBuffer = await downloadTelegramFile(fileId);
    
    if (!audioBuffer) {
      await sendTelegramMessage(chatId, MESSAGES.voice.errorProcess);
      return { handled: true, eventsCreated: 0 };
    }
    
    // Process audio locally (Telegram voice is OGG/Opus)
    const voiceResult = await processLocalAudio(audioBuffer, 'audio/ogg');
    
    if (!voiceResult.success) {
      console.error(`[Telegram Media] Voice processing error: ${voiceResult.error}`);
      await sender.send(MESSAGES.voice.errorUnderstand);
      await logMessage(userId, 'assistant', MESSAGES.voice.errorUnderstand, 'text');
      return { handled: true, eventsCreated: 0 };
    }
    
    // Extract events from normalized text
    const extraction = await parseEventWithFallback(
      voiceResult.normalizedText,
      undefined,
      familyMembers
    );
    
    const confidence = extraction.confidence ?? 
      (extraction.events.length > 0 ? 0.75 : 0.3);
    
    console.log(`[Telegram Media] Extracted ${extraction.events.length} events, confidence: ${confidence}`);
    
    // Create a BrainResult from extraction
    const brainResult: BrainResult = {
      action: extraction.events.length === 0 
        ? 'none' 
        : confidence >= MEDIA_CONFIG.confidenceThreshold 
          ? 'save'
          : confidence >= MEDIA_CONFIG.draftThreshold
            ? 'draft'
            : 'ask',
      events: extraction.events,
      confidence,
      clarificationQuestion: extraction.clarification_question,
      processedText: voiceResult.normalizedText,
    };
    
    // Use shared handler
    return handleBrainResult(brainResult, context, 'voice', sender);
    
  } catch (error) {
    console.error('[Telegram Media] Processing error:', error);
    await sender.send(MESSAGES.shared.genericError);
    return { handled: true, eventsCreated: 0 };
  }
}
