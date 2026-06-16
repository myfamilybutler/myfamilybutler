/**
 * Gemini Provider
 * 
 * Google Gemini 3 Flash Preview integration for event parsing and chat responses.
 * Used as primary provider when configured.
 */

import type { ChatMessage } from '@/types';
import type { ParsedEvent, EventExtractionResult } from '../types';
import { EventExtractorResponseSchema } from '../schemas';
import { buildEventExtractorPrompt, getButlerPersonaPrompt } from '../prompts';
import { logError } from '@/lib/utils/logger';
import { decrypt } from '@/lib/utils/encryption';
import { getAdminClient } from '@/lib/supabase/client';

// ===========================================
// Dynamic Import for Edge Runtime Compatibility
// ===========================================

let geminiModule: typeof import('@google/generative-ai') | null = null;

async function getGemini(householdId?: string | null) {
  if (!geminiModule) {
    geminiModule = await import('@google/generative-ai');
  }
  
  let apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  
  if (householdId) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('households')
        .select('gemini_api_key')
        .eq('id', householdId)
        .maybeSingle();
        
      if (data?.gemini_api_key) {
        const decrypted = decrypt(data.gemini_api_key);
        if (decrypted) {
          apiKey = decrypted;
        }
      }
    } catch (err) {
      logError('[Gemini] Error fetching household key:', err);
    }
  }

  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }
  
  const genAI = new geminiModule.GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1000,
    },
  });
}

// ===========================================
// Availability Check
// ===========================================

/**
 * Check if Gemini is available (API key configured globally or for household)
 */
export async function isGeminiAvailable(householdId?: string | null): Promise<boolean> {
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    return true;
  }
  if (householdId) {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('households')
        .select('gemini_api_key')
        .eq('id', householdId)
        .maybeSingle();
      return !!data?.gemini_api_key;
    } catch {
      return false;
    }
  }
  return false;
}

// ===========================================
// Event Parsing
// ===========================================

/**
 * Parse events using Gemini 3 Flash Preview
 * Full extraction result with clarification support
 * @param familyMembers - Optional list of known family members for matching
 */
export async function parseEventWithGemini(
  message: string,
  conversationHistory?: ChatMessage[],
  familyMembers?: string[],
  householdId?: string | null
): Promise<EventExtractionResult> {
  const model = await getGemini(householdId);
  const systemPrompt = buildEventExtractorPrompt(familyMembers, message);

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

    // SMART_AI_V2: Robust JSON cleanup before parsing
    content = cleanupAIResponse(content);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logError('[Gemini] JSON parse failed, attempting recovery:', parseError);
      // Try to extract JSON from within the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(cleanupAIResponse(jsonMatch[0]));
        } catch {
          // Give up on JSON recovery
          return salvagePartialResult(null);
        }
      } else {
        return salvagePartialResult(null);
      }
    }

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
        confidence: validated.data.confidence,
      };
    }

    // SMART_AI_V2: Salvage partial result instead of returning empty
    logError('[Gemini] Schema validation failed, attempting salvage:', validated.error);
    return salvagePartialResult(parsed);
  } catch (error) {
    logError('[Gemini] Event parsing error:', error);
    return { events: [], needs_clarification: false, intent_type: 'unknown' };
  }
}

/**
 * SMART_AI_V2: Clean up AI response before JSON parsing
 * Handles markdown blocks, trailing commas, and whitespace
 */
function cleanupAIResponse(content: string): string {
  let cleaned = content;
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '');
  
  // Remove trailing commas before } or ] (common AI mistake)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * SMART_AI_V2: Attempt to salvage partial results when schema validation fails
 * Returns with reduced confidence instead of empty result
 */
function salvagePartialResult(parsed: unknown): EventExtractionResult {
  if (!parsed || typeof parsed !== 'object') {
    return { events: [], needs_clarification: false, intent_type: 'unknown', confidence: 0.3 };
  }

  const obj = parsed as Record<string, unknown>;
  
  // Try to extract events even if schema validation failed
  const events: ParsedEvent[] = [];
  if (Array.isArray(obj.events)) {
    for (const e of obj.events) {
      if (typeof e === 'object' && e !== null) {
        const event = e as Record<string, unknown>;
        if (typeof event.title === 'string' && typeof event.event_date === 'string') {
          events.push({
            title: event.title,
            event_date: event.event_date,
            event_time: typeof event.event_time === 'string' ? event.event_time : undefined,
            is_all_day: typeof event.is_all_day === 'boolean' ? event.is_all_day : !event.event_time,
            family_member: typeof event.family_member === 'string' ? event.family_member : undefined,
            location: typeof event.location === 'string' ? event.location : undefined,
          });
        }
      }
    }
  }

  return {
    events,
    needs_clarification: typeof obj.needs_clarification === 'boolean' ? obj.needs_clarification : false,
    clarification_question: typeof obj.clarification_question === 'string' ? obj.clarification_question : undefined,
    intent_type: isValidIntentType(obj.intent_type) ? obj.intent_type : 'unknown',
    // Downgrade confidence for salvaged results
    confidence: typeof obj.confidence === 'number' ? obj.confidence * 0.7 : 0.5,
  };
}

function isValidIntentType(value: unknown): value is EventExtractionResult['intent_type'] {
  return typeof value === 'string' && [
    'calendar_event', 'reminder', 'school_announcement', 'action_required', 
    'schedule_change', 'leave_request', 'unknown'
  ].includes(value);
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
  newMessage: string,
  householdId?: string | null
): Promise<string> {
  const model = await getGemini(householdId);
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
    logError('[Gemini] Response generation error:', error);
    throw error;
  }
}
