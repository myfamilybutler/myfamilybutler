/**
 * The Brain - Unified Input Processor
 * 
 * Central orchestrator that:
 * 1. Normalizes any input type (text, image, voice) to text
 * 2. Extracts events using shared event extractor
  * 3. Applies confidence-based routing (85% threshold)

 * 4. Returns structured results with action recommendations
 * 
 * This is the "single funnel" that all inputs flow through.
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

// ===========================================
// Configuration
// ===========================================

const BRAIN_CONFIG = {
  /** Confidence threshold for auto-save (above = save, below = ask/draft) */
  confidenceThreshold: AI_DECISION_THRESHOLDS.save,
  /** Minimum confidence to save as draft (below = ask clarification) */
  draftThreshold: AI_DECISION_THRESHOLDS.draft,
};

// ===========================================
// Input Normalization
// ===========================================

/**
 * Normalize any input type to text
 * - Text: pass through
 * - Voice: transcribe + normalize dialect
 * - Image: extract via vision
 */
async function normalizeInput(input: UnifiedInput): Promise<{
  text: string;
  documentType?: string;
  events?: ParsedEvent[];
  confidence?: number;
  error?: string;
}> {
  switch (input.type) {
    case 'text':
    case 'document':
      return { text: input.content || '' };

    case 'voice': {
      if (!input.mediaId) {
        return { text: '', error: 'No media ID for voice message' };
      }
      
      const voiceResult = await processVoiceMessage({
        mediaId: input.mediaId,
        mimeType: input.mimeType,
      });
      
      if (!voiceResult.success) {
        return { text: '', error: voiceResult.error };
      }
      
      // Return the normalized (dialect-cleaned) text
      return { text: voiceResult.normalizedText };
    }

    case 'image': {
      if (!input.mediaId) {
        return { text: '', error: 'No media ID for image' };
      }
      
      // Vision processing already extracts events, so we return them directly
      const visionResult = await processVisionMessage({
        mediaId: input.mediaId,
        userId: input.userId,
        householdId: input.householdId,
        mimeType: input.mimeType,
      });
      
      if (!visionResult.success) {
        return { text: '', error: visionResult.error };
      }
      
      // For images, we already have extracted events
      // Convert VisionEvent to ParsedEvent format
      const events: ParsedEvent[] = visionResult.events.map(e => ({
        title: e.title,
        event_date: e.event_date,
        event_time: e.event_time ?? undefined,
        end_time: e.end_time ?? undefined,
        is_all_day: e.is_all_day,
        family_member: e.family_member ?? undefined,
        location: e.location ?? undefined,
        description: e.description ?? undefined,
      }));
      
      return {
        text: '',
        documentType: visionResult.documentType,
        events,
        confidence: visionResult.eventsCreated > 0 ? 0.85 : 0.5,
      };
    }

    default:
      return { text: '', error: `Unknown input type: ${input.type}` };
  }
}

// ===========================================
// Confidence-Based Routing
// ===========================================

/**
 * Determine the action based on extraction results and confidence
 */
function determineAction(
  extraction: EventExtractionResult,
  confidence: number
): { action: BrainResult['action']; clarificationQuestion?: string } {
  // No events found
  if (extraction.events.length === 0) {
    if (extraction.needs_clarification) {
      return { 
        action: 'ask', 
        clarificationQuestion: extraction.clarification_question 
      };
    }
    return { action: 'none' };
  }

  // High confidence: auto-save
  if (confidence >= BRAIN_CONFIG.confidenceThreshold) {
    return { action: 'save' };
  }

  // Medium confidence: save as draft
  if (confidence >= BRAIN_CONFIG.draftThreshold) {
    return { action: 'draft' };
  }

  // Low confidence: ask for clarification
  const question = extraction.clarification_question ||
    'Ich bin mir nicht sicher, ob ich das richtig verstanden habe. Könntest du mir mehr Details geben?';
  
  return { action: 'ask', clarificationQuestion: question };
}

// ===========================================
// Main Brain Function
// ===========================================

/**
 * Process any input type through the unified Brain
 * 
 * @param input - Unified input (text, image, or voice)
 * @returns BrainResult with action, events, and confidence
 */
export async function processInput(input: UnifiedInput): Promise<BrainResult> {
  console.log(`[Brain] Processing ${input.type} input for user ${input.userId}`);
  
  try {
    // Step 1: Normalize input to text (or get pre-extracted events for images)
    const normalized = await normalizeInput(input);
    
    if (normalized.error) {
      console.error(`[Brain] Normalization error: ${normalized.error}`);
      return {
        action: 'none',
        events: [],
        confidence: 0,
        error: normalized.error,
      };
    }

    // Step 2: For images, events are already extracted
    if (input.type === 'image' && normalized.events) {
      const confidence = normalized.confidence ?? 0.85;
      const { action, clarificationQuestion } = determineAction(
        { 
          events: normalized.events, 
          needs_clarification: false, 
          intent_type: 'calendar_event',
          confidence,
        },
        confidence
      );
      
      console.log(`[Brain] Image: ${normalized.events.length} events, confidence: ${confidence}, action: ${action}`);
      
      return {
        action,
        events: normalized.events,
        confidence,
        documentType: normalized.documentType,
        clarificationQuestion,
      };
    }

    // Step 3: For text/voice, extract events from the normalized text
    if (!normalized.text || normalized.text.trim().length === 0) {
      return {
        action: 'none',
        events: [],
        confidence: 0,
        processedText: normalized.text,
      };
    }

    console.log(`[Brain] Extracting events from: "${normalized.text.substring(0, 100)}..."`);
    
    const extraction = await parseEventWithFallback(
      normalized.text,
      input.conversationHistory,
      input.familyMembers
    );

    // Step 4: Determine confidence (use AI's confidence or estimate)
    const confidence = extraction.confidence ?? 
      (extraction.events.length > 0 ? 0.75 : 0.3);

    // Step 5: Apply confidence-based routing
    const { action, clarificationQuestion } = determineAction(extraction, confidence);

    console.log(`[Brain] Result: ${extraction.events.length} events, confidence: ${confidence}, action: ${action}`);

    return {
      action,
      events: extraction.events,
      confidence,
      clarificationQuestion,
      processedText: normalized.text,
    };

  } catch (error) {
    console.error('[Brain] Processing error:', error);
    return {
      action: 'none',
      events: [],
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
