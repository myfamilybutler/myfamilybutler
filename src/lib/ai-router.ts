// ===========================================
// Unified AI Router
// ===========================================
// Provides automatic fallback between AI providers
// Primary: OpenAI GPT-4o | Fallback: Gemini 1.5 Flash

import type { ChatMessage } from '@/types';
import { 
  parseEventWithClarification, 
  generateAIResponse as generateOpenAIResponse,
  type ParsedEvent,
  type EventExtractionResult,
} from './openai';
import { 
  parseEventWithGemini, 
  generateGeminiResponse,
  isGeminiAvailable,
} from './gemini';

// ===========================================
// Configuration
// ===========================================

const AI_CONFIG = {
  enableFallback: true,
  maxRetries: 1,
  timeoutMs: 10000,
};

// ===========================================
// Event Parsing with Fallback
// ===========================================

/**
 * Parse events with automatic fallback to Gemini if OpenAI fails
 */
export async function parseEventWithFallback(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<EventExtractionResult> {
  // Try primary provider (OpenAI)
  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        parseEventWithClarification(message, conversationHistory),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), AI_CONFIG.timeoutMs)
        )
      ]);
      
      if (result.events.length > 0 || result.needs_clarification || result.intent_type !== 'unknown') {
        return result;
      }
      // Empty result - break to try fallback
      break;
      
    } catch (error) {
      // Rate limit? Backoff and retry
      const isRateLimit = error instanceof Error && /rate limit|429/i.test(error.message);
      if (isRateLimit && attempt < AI_CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (2 ** attempt)));
        continue;
      }
      // Log non-rate-limit errors for debugging
      if (!isRateLimit) {
        console.error('[AI Router] OpenAI error:', error);
      }
    }
  }
  
  // Fallback to Gemini
  if (AI_CONFIG.enableFallback && isGeminiAvailable()) {
    try {
      return await parseEventWithGemini(message, conversationHistory);
    } catch {
      // Gemini also failed
    }
  }
  
  return { events: [], needs_clarification: false, intent_type: 'unknown' };
}

/**
 * Simple event parsing (backwards compatible)
 * Returns just events array or null
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
 */
export async function generateResponseWithFallback(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  // Try OpenAI first
  try {
    console.log('[AI Router] Generating response with OpenAI');
    return await generateOpenAIResponse(history, newMessage);
  } catch (error) {
    console.error('[AI Router] OpenAI response failed:', error);
  }
  
  // Fallback to Gemini
  if (AI_CONFIG.enableFallback && isGeminiAvailable()) {
    try {
      console.log('[AI Router] Falling back to Gemini for response');
      return await generateGeminiResponse(history, newMessage);
    } catch (error) {
      console.error('[AI Router] Gemini response failed:', error);
    }
  }
  
  // All failed - return error message
  return 'Entschuldigung, ich habe gerade technische Schwierigkeiten. Bitte versuchen Sie es später erneut. 🙏';
}

// ===========================================
// Exports for direct provider access
// ===========================================

export { 
  parseEventWithClarification,
  generateAIResponse,
} from './openai';

export {
  parseEventWithGemini,
  generateGeminiResponse,
  isGeminiAvailable,
} from './gemini';

export type { ParsedEvent, EventExtractionResult } from './openai';
