/**
 * AI Module - Main Entry Point
 * 
 * Unified AI interface with automatic fallback between providers.
 * Primary: Gemini 3 Flash Preview (free/cheap) | Fallback: OpenAI GPT-4o-mini
 */

import type { ChatMessage } from '@/types';
import type { EventExtractionResult } from './types';
import { 
  parseEventWithClarification, 
  generateAIResponse as generateOpenAIResponse,
} from './providers/openai';
import { log, logError } from '@/lib/utils/logger';
import { 
  parseEventWithGemini, 
  generateGeminiResponse,
  isGeminiAvailable,
} from './providers/gemini';

// ===========================================
// Configuration
// ===========================================

const AI_CONFIG = {
  enableFallback: true,
  maxRetries: 1,
  timeoutMs: 15000, // Gemini can be slower, give it more time
};

/**
 * Extended result with logging metadata
 */
export interface EventExtractionResultWithMeta extends EventExtractionResult {
  _meta?: {
    model: string;
    latencyMs: number;
    promptVersion: string;
  };
}

/**
 * Parse events with automatic fallback
 * Primary: Gemini 3 Flash Preview | Fallback: OpenAI GPT-4o-mini
 * @param familyMembers - Optional list of known family members for matching
 */
export async function parseEventWithFallback(
  message: string,
  conversationHistory?: ChatMessage[],
  familyMembers?: string[],
  householdId?: string | null
): Promise<EventExtractionResultWithMeta> {
  const startTime = performance.now();
  
  // Try primary provider (Gemini - free/cheap)
  if (await isGeminiAvailable(householdId)) {
    for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
      try {
        log.info('[AI] Parsing with Gemini (primary)');
        const result = await Promise.race([
          parseEventWithGemini(message, conversationHistory, familyMembers, householdId),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), AI_CONFIG.timeoutMs)
          )
        ]);
        
        if (result.events.length > 0 || result.needs_clarification || result.intent_type !== 'unknown') {
          return {
            ...result,
            _meta: {
              model: 'gemini-3-flash-preview',
              latencyMs: Math.round(performance.now() - startTime),
              promptVersion: 'event-v1.0',
            },
          };
        }
        break;
        
      } catch (error) {
        const isRateLimit = error instanceof Error && /rate limit|429|quota/i.test(error.message);
        if (isRateLimit && attempt < AI_CONFIG.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (2 ** attempt)));
          continue;
        }
        logError('[AI] Gemini error:', error);
      }
    }
  }
  
  // Fallback to OpenAI (GPT-4o-mini - cheapest)
  if (AI_CONFIG.enableFallback) {
    try {
      log.info('[AI] Falling back to OpenAI GPT-4o-mini');
      const result = await parseEventWithClarification(message, conversationHistory, familyMembers);
      return {
        ...result,
        _meta: {
          model: 'gpt-4o-mini',
          latencyMs: Math.round(performance.now() - startTime),
          promptVersion: 'event-v1.0',
        },
      };
    } catch (error) {
      logError('[AI] OpenAI fallback failed:', error);
    }
  }
  
  return { 
    events: [], 
    needs_clarification: false, 
    intent_type: 'unknown',
    _meta: {
      model: 'none',
      latencyMs: Math.round(performance.now() - startTime),
      promptVersion: 'event-v1.0',
    },
  };
}

// ===========================================
// Chat Response with Fallback
// ===========================================

/**
 * Generate AI chat response with automatic fallback
 * Primary: Gemini 3 Flash Preview | Fallback: OpenAI GPT-4o-mini
 */
export async function generateResponseWithFallback(
  history: ChatMessage[],
  newMessage: string,
  householdId?: string | null
): Promise<string> {
  // Try Gemini first (free/cheap)
  if (await isGeminiAvailable(householdId)) {
    try {
      log.info('[AI] Generating response with Gemini (primary)');
      return await generateGeminiResponse(history, newMessage, householdId);
    } catch (error) {
      logError('[AI] Gemini response failed:', error);
    }
  }
  
  // Fallback to OpenAI (GPT-4o-mini - cheapest)
  if (AI_CONFIG.enableFallback) {
    try {
      log.info('[AI] Falling back to OpenAI GPT-4o-mini for response');
      return await generateOpenAIResponse(history, newMessage);
    } catch (error) {
      logError('[AI] OpenAI fallback failed:', error);
    }
  }
  
  return 'Entschuldigung, ich habe gerade technische Schwierigkeiten. Bitte versuche es später erneut. 🙏';
}

// ===========================================
// Re-exports for Direct Access
// ===========================================

// Types
export type { 
  ParsedEvent, 
  EventExtractionResult, 
  ParsedReminder,
  VoiceProcessingResult,
  UnifiedInput,
  BrainResult,
  BrainAction,
  InputType,
  DraftEvent,
  DraftStatus,
} from './types';

// Brain (Unified Input Processor)
export {
  processInput,
} from './brain';

// OpenAI direct access
export { 
  parseEventWithClarification,
  generateAIResponse,
} from './providers/openai';

// Gemini direct access
export {
  parseEventWithGemini,
  generateGeminiResponse,
  isGeminiAvailable,
} from './providers/gemini';

// Prompt builders
export {
  getWhisperContextPrompt,
  buildDialectNormalizerPrompt,
} from './prompts';
