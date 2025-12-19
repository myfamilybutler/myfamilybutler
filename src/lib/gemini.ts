// ===========================================
// Gemini AI Integration (Fallback Provider)
// ===========================================
// Native multimodal support for audio, image, and text
// Used as cost-effective fallback when OpenAI fails or for specific use cases

import { z } from 'zod';
import type { ChatMessage } from '@/types';
import { APP_CONFIG } from './config';
import type { ParsedEvent, EventExtractionResult } from './openai';

// ===========================================
// Lazy initialization to prevent build-time errors
// ===========================================
let geminiModule: typeof import('@google/generative-ai') | null = null;
let geminiModelInstance: import('@google/generative-ai').GenerativeModel | null = null;

async function getGemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  
  if (!geminiModule) {
    geminiModule = await import('@google/generative-ai');
  }
  
  if (!geminiModelInstance) {
    const genAI = new geminiModule.GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );
    geminiModelInstance = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
        maxOutputTokens: 2000,
      },
    });
  }
  
  return geminiModelInstance;
}

// ===========================================
// Zod Schema (matching OpenAI schemas)
// ===========================================
const GeminiEventSchema = z.object({
  intent_type: z.enum(['calendar_event', 'reminder', 'unknown']),
  has_events: z.boolean(),
  events: z.array(z.object({
    title: z.string(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    is_all_day: z.boolean(),
    family_member: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })).optional(),
  needs_clarification: z.boolean(),
  clarification_question: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
});

// ===========================================
// Dynamic Context Generator
// ===========================================
function getGeminiEventExtractorPrompt(): string {
  const now = new Date();
  const timezone = APP_CONFIG.localization.timezone;
  
  const currentISOTimestamp = now.toLocaleString('sv-SE', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(' ', 'T');
  
  const dayOfWeek = now.toLocaleDateString('en-US', { 
    timeZone: timezone, 
    weekday: 'long' 
  });
  
  const currentDate = now.toLocaleDateString('en-CA', { timeZone: timezone });
  
  return `You are the "Event Extractor" for a family calendar app. Parse user intent into structured calendar data.

# Critical Context
- Current Time: ${currentISOTimestamp} (${timezone})
- Today is: ${dayOfWeek}, ${currentDate}

# Processing Rules
1. Convert relative dates ("tomorrow", "next Tuesday") to absolute YYYY-MM-DD
2. Time defaults: "Tonight"=19:00, "Morning"=09:00, "Lunch"=12:00, "Dinner"=19:00
3. If user confirms with "ja", "yes", "alle", extract ALL events from context
4. Set needs_clarification=true only for critical missing info (time for time-sensitive events)

# Output (JSON only, no markdown)
{
  "intent_type": "calendar_event" | "reminder" | "unknown",
  "has_events": boolean,
  "events": [{"title":"string","event_date":"YYYY-MM-DD","event_time":"HH:MM"|null,"end_time":"HH:MM"|null,"is_all_day":boolean,"family_member":"name"|null,"location":"place"|null,"description":"string"|null}],
  "needs_clarification": boolean,
  "clarification_question": "string in German" | null,
  "confidence": 0.0-1.0
}`;
}

// ===========================================
// Gemini Event Parsing
// ===========================================

/**
 * Parse event intent using Gemini 1.5 Flash
 * Returns full extraction result with clarification support
 */
export async function parseEventWithGemini(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<EventExtractionResult> {
  try {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Gemini] API key not configured, skipping');
      return {
        events: [],
        needs_clarification: false,
        intent_type: 'unknown',
      };
    }

    const model = await getGemini();
    const systemPrompt = getGeminiEventExtractorPrompt();
    
    // Build conversation context
    const historyContext = conversationHistory
      ? conversationHistory.slice(-6).map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')
      : '';
    
    const fullPrompt = historyContext
      ? `${systemPrompt}\n\n# Previous Conversation:\n${historyContext}\n\n# Current Message:\n${message}`
      : `${systemPrompt}\n\n# User Message:\n${message}`;
    
    console.log('[Gemini] Sending request...');
    
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();
    
    console.log('[Gemini] Response:', responseText);
    
    // Parse and validate
    const parsedRaw = JSON.parse(responseText);
    const validated = GeminiEventSchema.safeParse(parsedRaw);
    
    if (!validated.success) {
      console.error('[Gemini] Schema validation failed:', validated.error);
      return {
        events: [],
        needs_clarification: false,
        intent_type: 'unknown',
      };
    }
    
    const data = validated.data;
    
    const events: ParsedEvent[] = (data.events || []).map(event => ({
      title: event.title,
      event_date: event.event_date,
      event_time: event.event_time || undefined,
      end_time: event.end_time || undefined,
      is_all_day: event.is_all_day,
      family_member: event.family_member || undefined,
      location: event.location || undefined,
      description: event.description || undefined,
    }));
    
    console.log(`[Gemini] Detected ${events.length} events (confidence: ${data.confidence || 'N/A'})`);
    
    return {
      events,
      needs_clarification: data.needs_clarification,
      clarification_question: data.clarification_question || undefined,
      intent_type: data.intent_type,
    };
  } catch (error) {
    console.error('[Gemini] Event parsing error:', error);
    return {
      events: [],
      needs_clarification: false,
      intent_type: 'unknown',
    };
  }
}

/**
 * Simple event parsing that returns just events (for backwards compatibility)
 */
export async function parseEventIntentGemini(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ParsedEvent[] | null> {
  const result = await parseEventWithGemini(message, conversationHistory);
  return result.events.length > 0 ? result.events : null;
}

// ===========================================
// Gemini Chat Response
// ===========================================

/**
 * Generate a conversational AI response using Gemini
 * More cost-effective alternative to GPT-4o for general chat
 */
export async function generateGeminiResponse(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const model = await getGemini();
    
    const systemPrompt = APP_CONFIG.ai.systemPrompts.butlerPersona;
    
    const historyContext = history.slice(-10).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    
    const fullPrompt = historyContext
      ? `${systemPrompt}\n\n---\nConversation History:\n${historyContext}\n\nUser: ${newMessage}\n\nAssistant:`
      : `${systemPrompt}\n\nUser: ${newMessage}\n\nAssistant:`;
    
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();
    
    return responseText;
  } catch (error) {
    console.error('[Gemini] Chat response error:', error);
    throw error;
  }
}

// ===========================================
// Check Gemini availability
// ===========================================
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
