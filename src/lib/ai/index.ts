/**
 * AI Module - Main Entry Point
 * 
 * Unified AI interface with automatic fallback between providers.
 * Primary: Gemini 1.5 Flash (free/cheap) | Fallback: OpenAI GPT-4o-mini
 */

import type { ChatMessage } from '@/types';
import type { ParsedEvent, EventExtractionResult } from './types';
import { 
  parseEventWithClarification, 
  generateAIResponse as generateOpenAIResponse,
} from './providers/openai';
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

// ===========================================
// Event Parsing with Fallback
// ===========================================

/**
 * Parse events with automatic fallback
 * Primary: Gemini 1.5 Flash | Fallback: OpenAI GPT-4o-mini
 */
export async function parseEventWithFallback(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<EventExtractionResult> {
  // Try primary provider (Gemini - free/cheap)
  if (isGeminiAvailable()) {
    for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
      try {
        console.log('[AI] Parsing with Gemini (primary)');
        const result = await Promise.race([
          parseEventWithGemini(message, conversationHistory),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), AI_CONFIG.timeoutMs)
          )
        ]);
        
        if (result.events.length > 0 || result.needs_clarification || result.intent_type !== 'unknown') {
          return result;
        }
        break;
        
      } catch (error) {
        const isRateLimit = error instanceof Error && /rate limit|429|quota/i.test(error.message);
        if (isRateLimit && attempt < AI_CONFIG.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (2 ** attempt)));
          continue;
        }
        console.error('[AI] Gemini error:', error);
      }
    }
  }
  
  // Fallback to OpenAI (GPT-4o-mini - cheapest)
  if (AI_CONFIG.enableFallback) {
    try {
      console.log('[AI] Falling back to OpenAI GPT-4o-mini');
      return await parseEventWithClarification(message, conversationHistory);
    } catch (error) {
      console.error('[AI] OpenAI fallback failed:', error);
    }
  }
  
  return { events: [], needs_clarification: false, intent_type: 'unknown' };
}

/**
 * Simple event parsing (backwards compatible)
 */
export async function parseEventWithFallbackSimple(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ParsedEvent[] | null> {
  const result = await parseEventWithFallback(message, conversationHistory);
  return result.events.length > 0 ? result.events : null;
}

// ===========================================
// Chat Response with Fallback
// ===========================================

/**
 * Generate AI chat response with automatic fallback
 * Primary: Gemini 1.5 Flash | Fallback: OpenAI GPT-4o-mini
 */
export async function generateResponseWithFallback(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  // Try Gemini first (free/cheap)
  if (isGeminiAvailable()) {
    try {
      console.log('[AI] Generating response with Gemini (primary)');
      return await generateGeminiResponse(history, newMessage);
    } catch (error) {
      console.error('[AI] Gemini response failed:', error);
    }
  }
  
  // Fallback to OpenAI (GPT-4o-mini - cheapest)
  if (AI_CONFIG.enableFallback) {
    try {
      console.log('[AI] Falling back to OpenAI GPT-4o-mini for response');
      return await generateOpenAIResponse(history, newMessage);
    } catch (error) {
      console.error('[AI] OpenAI fallback failed:', error);
    }
  }
  
  return 'Entschuldigung, ich habe gerade technische Schwierigkeiten. Bitte versuche es später erneut. 🙏';
}

// ===========================================
// Re-exports for Direct Access
// ===========================================

// Types
export type { ParsedEvent, EventExtractionResult, ParsedReminder } from './types';

// OpenAI direct access
export { 
  parseEventWithClarification,
  parseEventIntent,
  generateAIResponse,
  parseReminderIntent,
} from './providers/openai';

// Gemini direct access
export {
  parseEventWithGemini,
  parseEventIntentGemini,
  generateGeminiResponse,
  isGeminiAvailable,
} from './providers/gemini';
