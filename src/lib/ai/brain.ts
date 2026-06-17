/**
 * The Brain - Unified Input Processor
 * 
 * Single funnel for all inputs:
 * 1. Text → Extract events
 * 2. Image (buffer) → Vision extract events
 * 3. Voice (buffer) → Transcribe → Extract events
 * 4. Document (buffer) → Parse → Extract events
 */

import type { 
  UnifiedInput, 
  BrainResult, 
  ParsedEvent,
  EventExtractionResult,
} from './types';
import { parseEventWithFallback } from './index';
import { AI_DECISION_THRESHOLDS } from './constants';
import { processVoiceMessageInternal } from '@/lib/ai/voice-processor';
import { processVisionMessageInternal } from '@/lib/ai/vision-processor';
import { log, logError } from '@/lib/utils/logger';

const BRAIN_CONFIG = {
  confidenceThreshold: AI_DECISION_THRESHOLDS.save,
  draftThreshold: AI_DECISION_THRESHOLDS.draft,
};

/**
 * Process any input through the unified Brain
 */
export async function processInput(input: UnifiedInput): Promise<BrainResult> {
  const lang = input.language || 'de';
  log.info(`[Brain] Processing ${input.type} for user ${input.userId} in language: ${lang}`);
  
  try {
    // Route based on input type
    switch (input.type) {
      case 'text':
        return processText(input.content || '', input, lang);
        
      case 'image':
        if (!input.attachment) {
          return { action: 'none', events: [], confidence: 0, error: 'No image provided' };
        }
        return processImage(input.attachment, input, lang);
        
      case 'voice':
        if (!input.attachment) {
          return { action: 'none', events: [], confidence: 0, error: 'No voice message provided' };
        }
        return processVoice(input.attachment, input, lang);
        
      case 'document':
        if (!input.attachment) {
          return { action: 'none', events: [], confidence: 0, error: 'No document provided' };
        }
        return processDocument(lang);
        
      default:
        return { action: 'none', events: [], confidence: 0, error: `Unknown type: ${input.type}` };
    }
  } catch (error) {
    logError('[Brain] Error:', error);
    return {
      action: 'none',
      events: [],
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process text input
 */
async function processText(text: string, input: UnifiedInput, lang: 'de' | 'en'): Promise<BrainResult> {
  const extraction = await parseEventWithFallback(
    text,
    input.conversationHistory,
    input.familyMembers,
    input.householdId,
    lang
  );
  
  const confidence = extraction.confidence ?? (extraction.events.length > 0 ? 0.75 : 0.3);
  const { action, clarificationQuestion } = determineAction(extraction, confidence, lang);
  
  log.info(`[Brain] Text: ${extraction.events.length} events, confidence: ${confidence}, action: ${action}`);
  
  return {
    action,
    events: extraction.events,
    confidence,
    clarificationQuestion,
    processedText: text,
  };
}

/**
 * Process image input - extract events directly via vision
 */
async function processImage(
  attachment: { buffer: Buffer; mimeType: string },
  input: UnifiedInput,
  lang: 'de' | 'en'
): Promise<BrainResult> {
  const result = await processVisionMessageInternal({
    userId: input.userId,
    householdId: input.householdId,
    imageBuffer: attachment.buffer,
    mimeType: attachment.mimeType,
  });
  
  if (!result.success) {
    return { action: 'none', events: [], confidence: 0, error: result.error ?? 'Vision failed' };
  }
  
  const events: ParsedEvent[] = result.events.map(e => ({
    title: e.title,
    event_date: e.event_date,
    event_time: e.event_time ?? undefined,
    end_time: e.end_time ?? undefined,
    is_all_day: e.is_all_day,
    family_member: e.family_member ?? undefined,
    location: e.location ?? undefined,
    description: e.description ?? undefined,
  }));
  
  const confidence = result.eventsCreated > 0 ? 0.85 : 0.5;

  // If vision already saved the events to the DB, don't ask the pipeline to save them again.
  if (result.eventsCreated > 0) {
    log.info(`[Brain] Image: ${events.length} events already saved by vision`);
    return {
      action: 'already_saved' as const,
      events,
      confidence,
      documentType: result.documentType,
      clarificationQuestion: result.clarificationQuestion,
    };
  }

  const { action, clarificationQuestion } = determineAction(
    { events, needs_clarification: result.clarificationNeeded ?? false, intent_type: 'calendar_event', confidence },
    confidence,
    lang
  );

  log.info(`[Brain] Image: ${events.length} events, confidence: ${confidence}, action: ${action}`);

  return {
    action,
    events,
    confidence,
    documentType: result.documentType,
    clarificationQuestion: result.clarificationQuestion ?? clarificationQuestion,
  };
}

/**
 * Process voice input - transcribe then extract
 */
async function processVoice(
  attachment: { buffer: Buffer; mimeType: string },
  input: UnifiedInput,
  lang: 'de' | 'en'
): Promise<BrainResult> {
  const voiceResult = await processVoiceMessageInternal({
    audioBuffer: attachment.buffer,
    mimeType: attachment.mimeType,
  });
  
  if (!voiceResult.success) {
    return { action: 'none', events: [], confidence: 0, error: voiceResult.error };
  }
  
  // After transcription, treat as text
  return processText(voiceResult.normalizedText, input, lang);
}

/**
 * Process document input (PDF, etc.)
 * Documents are not yet supported; ask the user to type the relevant dates.
 */
async function processDocument(lang: 'de' | 'en'): Promise<BrainResult> {
  return {
    action: 'ask',
    events: [],
    confidence: 0,
    clarificationQuestion: lang === 'de'
      ? 'Dokumente kann ich noch nicht direkt verarbeiten. Kannst du mir die wichtigsten Termine als Text schicken?'
      : 'I cannot process documents directly yet. Can you please send the most important dates as text?',
  };
}

/**
 * Determine action based on confidence
 */
function determineAction(
  extraction: EventExtractionResult,
  confidence: number,
  lang: 'de' | 'en'
): { action: BrainResult['action']; clarificationQuestion?: string } {
  if (extraction.events.length === 0) {
    if (extraction.needs_clarification) {
      return { action: 'ask', clarificationQuestion: extraction.clarification_question ?? undefined };
    }
    return { action: 'none' };
  }
  
  if (confidence >= BRAIN_CONFIG.confidenceThreshold) {
    return { action: 'save' };
  }
  
  if (confidence >= BRAIN_CONFIG.draftThreshold) {
    return { action: 'draft' };
  }
  
  return {
    action: 'ask',
    clarificationQuestion: extraction.clarification_question ?? (
      lang === 'de'
        ? 'Ich bin mir nicht sicher, ob ich das richtig verstanden habe. Könntest du mir mehr Details geben?'
        : 'I\'m not sure I understood that correctly. Could you please give me more details?'
    ),
  };
}
