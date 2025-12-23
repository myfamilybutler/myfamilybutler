/**
 * Gemini Provider
 * 
 * Google Gemini 1.5 Flash integration for event parsing and chat responses.
 * Used as fallback when OpenAI is unavailable.
 */

import type { ChatMessage } from '@/types';
import type { ParsedEvent, EventExtractionResult } from '../types';
import { EventExtractorResponseSchema } from '../schemas';
import { buildEventExtractorPrompt, getButlerPersonaPrompt } from '../prompts';

// ===========================================
// Dynamic Import for Edge Runtime Compatibility
// ===========================================

let geminiModule: typeof import('@google/generative-ai') | null = null;
let geminiModelInstance: import('@google/generative-ai').GenerativeModel | null = null;

async function getGemini() {
  if (!geminiModelInstance) {
    if (!geminiModule) {
      geminiModule = await import('@google/generative-ai');
    }
    
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }
    
    const genAI = new geminiModule.GoogleGenerativeAI(apiKey);
    geminiModelInstance = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
      },
    });
  }
  return geminiModelInstance;
}

// ===========================================
// Availability Check
// ===========================================

/**
 * Check if Gemini is available (API key configured)
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GOOGLE_GEMINI_API_KEY;
}

// ===========================================
// Event Parsing
// ===========================================

/**
 * Parse events using Gemini 1.5 Flash
 * Full extraction result with clarification support
 * @param familyMembers - Optional list of known family members for matching
 */
export async function parseEventWithGemini(
  message: string,
  conversationHistory?: ChatMessage[],
  familyMembers?: string[]
): Promise<EventExtractionResult> {
  const model = await getGemini();
  const systemPrompt = buildEventExtractorPrompt(familyMembers);

  // Build conversation context
  let fullPrompt = systemPrompt + '\n\n';
  
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
  }
  
  fullPrompt += `User: ${message}\n\nAntworte NUR mit JSON:`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let content = response.text();

    // Clean up response (remove markdown code blocks if present)
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(content);
    const validated = EventExtractorResponseSchema.safeParse(parsed);

    if (validated.success) {
      const events: ParsedEvent[] = (validated.data.events || []).map((e) => ({
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
        events,
        needs_clarification: validated.data.needs_clarification,
        clarification_question: validated.data.clarification_question ?? undefined,
        intent_type: validated.data.intent_type,
      };
    }

    console.error('[Gemini] Schema validation failed:', validated.error);
    return { events: [], needs_clarification: false, intent_type: 'unknown' };
  } catch (error) {
    console.error('[Gemini] Event parsing error:', error);
    return { events: [], needs_clarification: false, intent_type: 'unknown' };
  }
}

/**
 * Simple event parsing (backwards compatible)
 */
export async function parseEventIntentGemini(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ParsedEvent[] | null> {
  const result = await parseEventWithGemini(message, conversationHistory);
  return result.events.length > 0 ? result.events : null;
}

// ===========================================
// Chat Response Generation
// ===========================================

/**
 * Generate a conversational AI response using Gemini
 */
export async function generateGeminiResponse(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const model = await getGemini();
  const systemPrompt = getButlerPersonaPrompt();

  // Build conversation as single prompt
  let fullPrompt = systemPrompt + '\n\n';
  
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
  }
  
  fullPrompt += `User: ${newMessage}\n\nAssistant:`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text() || 'Entschuldigung, ich konnte keine Antwort generieren.';
  } catch (error) {
    console.error('[Gemini] Response generation error:', error);
    throw error;
  }
}
