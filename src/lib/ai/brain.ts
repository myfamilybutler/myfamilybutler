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
import { processVoiceMessage } from '@/actions/process-voice';
import { processVisionMessage } from '@/actions/process-vision';

const BRAIN_CONFIG = {
  confidenceThreshold: AI_DECISION_THRESHOLDS.save,
  draftThreshold: AI_DECISION_THRESHOLDS.draft,
};

/**
 * Process any input through the unified Brain
 */
export async function processInput(input: UnifiedInput): Promise<BrainResult> {
  console.log(`[Brain] Processing ${input.type} for user ${input.userId}`);
  
  try {
    // Route based on input type
    switch (input.type) {
      case 'text':
        return processText(input.content || '', input);
        
      case 'image':
        if (!input.attachment) {
          return { action: 'none', events: [], confidence: 0, error: 'No image provided' };
        }
        return processImage(input.attachment, input);
        
      case 'voice':
        if (!input.attachment) {
          return { action: 'none', events: [], confidence: 0, error: 'No voice message provided' };
        }
        return processVoice(input.attachment, input);
        
      case 'document':
        if (!input.attachment) {
          return { action: 'none', events: [], confidence: 0, error: 'No document provided' };
        }
        return processDocument(input.attachment);
        
      default:
        return { action: 'none', events: [], confidence: 0, error: `Unknown type: ${input.type}` };
    }
  } catch (error) {
    console.error('[Brain] Error:', error);
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
async function processText(text: string, input: UnifiedInput): Promise<BrainResult> {
  const extraction = await parseEventWithFallback(
    text,
    input.conversationHistory,
    input.familyMembers
  );
  
  const confidence = extraction.confidence ?? (extraction.events.length > 0 ? 0.75 : 0.3);
  const { action, clarificationQuestion } = determineAction(extraction, confidence);
  
  console.log(`[Brain] Text: ${extraction.events.length} events, confidence: ${confidence}, action: ${action}`);
  
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
async function processImage(attachment: { buffer: Buffer; mimeType: string }, input: UnifiedInput): Promise<BrainResult> {
  const result = await processVisionMessage({
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
  const { action, clarificationQuestion } = determineAction(
    { events, needs_clarification: result.clarificationNeeded ?? false, intent_type: 'calendar_event', confidence },
    confidence
  );
  
  console.log(`[Brain] Image: ${events.length} events, confidence: ${confidence}, action: ${action}`);
  
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
async function processVoice(attachment: { buffer: Buffer; mimeType: string }, input: UnifiedInput): Promise<BrainResult> {
  const voiceResult = await processVoiceMessage({
    audioBuffer: attachment.buffer,
    mimeType: attachment.mimeType,
  });
  
  if (!voiceResult.success) {
    return { action: 'none', events: [], confidence: 0, error: voiceResult.error };
  }
  
  // After transcription, treat as text
  return processText(voiceResult.normalizedText, input);
}

/**
 * Process document input (PDF, etc.)
 * For now: extract text then process as text (future: document parsing)
 */
async function processDocument(attachment: { buffer: Buffer; mimeType: string; filename?: string }): Promise<BrainResult> {
  // TODO: Implement document text extraction for PDFs
  // For now, return error suggesting user types the content
  console.log(`[Brain] Document received: ${attachment.filename ?? 'unnamed'} (${attachment.mimeType})`);
  
  return {
    action: 'ask',
    events: [],
    confidence: 0,
    clarificationQuestion: 'Dokumente kann ich noch nicht direkt verarbeiten. Kannst du mir die wichtigsten Termine als Text schicken?',
  };
}

/**
 * Determine action based on confidence
 */
function determineAction(
  extraction: EventExtractionResult,
  confidence: number
): { action: BrainResult['action']; clarificationQuestion?: string } {
  if (extraction.events.length === 0) {
    if (extraction.needs_clarification) {
      return { action: 'ask', clarificationQuestion: extraction.clarification_question };
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
    clarificationQuestion: extraction.clarification_question ?? 
      'Ich bin mir nicht sicher, ob ich das richtig verstanden habe. Könntest du mir mehr Details geben?',
  };
}
