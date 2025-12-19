// ===========================================
// OpenAI Integration
// ===========================================
import OpenAI from 'openai';
import { z } from 'zod';
import type { ChatMessage } from '@/types';
import { APP_CONFIG } from './config';

// Initialize OpenAI client lazily to prevent build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// Zod Schemas for Validation
const ReminderSchema = z.object({
  isReminder: z.boolean(),
  task: z.string().optional(),
  datetime: z.string().datetime().optional(),
});

// Enhanced Event Schema with clarification support
const ExtractedEventSchema = z.object({
  title: z.string(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  is_all_day: z.boolean(),
  family_member: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const EventExtractorResponseSchema = z.object({
  intent_type: z.enum(['calendar_event', 'reminder', 'unknown']),
  has_events: z.boolean(),
  events: z.array(ExtractedEventSchema).optional(),
  needs_clarification: z.boolean(),
  clarification_question: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
});

// Legacy schemas for backwards compatibility
const SingleEventSchema = z.object({
  title: z.string(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  is_all_day: z.boolean().optional(),
  family_member: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const EventResponseSchema = z.object({
  hasEvents: z.boolean(),
  events: z.array(SingleEventSchema).optional(),
});

const EventSchema = z.object({
  isEvent: z.boolean(),
  title: z.string().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  event_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  is_all_day: z.boolean().optional(),
  family_member: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * Generate an AI response based on conversation history and new message
 */
export async function generateAIResponse(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: APP_CONFIG.ai.systemPrompts.butlerPersona },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: newMessage },
    ];

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    return responseContent;
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return a friendly error message
    return 'Entschuldigung, ich habe gerade technische Schwierigkeiten. Bitte versuchen Sie es in einem Moment noch einmal. 🙏';
  }
}

/**
 * Parse a message to check if it contains a reminder request
 * Returns parsed reminder info or null if not a reminder
 */
export async function parseReminderIntent(
  message: string
): Promise<{ task: string; datetime: Date } | null> {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a reminder parser. Analyze the user message and determine if they want to set a reminder.
          
If yes, respond with ONLY valid JSON in this format:
{"isReminder": true, "task": "the task description", "datetime": "ISO 8601 datetime string"}

If no, respond with ONLY:
{"isReminder": false}

When parsing times:
- Assume Austrian timezone (${APP_CONFIG.localization.timezone})
- "tomorrow" means the next day at 9:00 AM
- "in X hours" means current time + X hours
- If time is ambiguous, assume 9:00 AM

Current date/time for reference: ${new Date().toLocaleString('en-US', { timeZone: APP_CONFIG.localization.timezone })}`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 200,
      temperature: 0,
      response_format: { type: "json_object" } // Enforce JSON mode
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return null;
    }

    // Parse and Validate with Zod
    const parsedRaw = JSON.parse(responseContent);
    const result = ReminderSchema.safeParse(parsedRaw);

    if (!result.success) {
      console.error('Reminder validation failed:', result.error);
      return null;
    }
    
    const data = result.data;
    
    if (data.isReminder && data.task && data.datetime) {
      return {
        task: data.task,
        datetime: new Date(data.datetime),
      };
    }

    return null;
  } catch (error) {
    console.error('Reminder parsing error:', error);
    return null;
  }
}

/**
 * Parse a message to extract event information
 * Enhanced "Event Extractor" with dynamic context and clarification handling
 * Returns parsed event info, clarification request, or null if no event detected
 */
export interface ParsedEvent {
  title: string;
  event_date: string;       // YYYY-MM-DD
  event_time?: string;      // HH:MM or undefined for all-day
  end_time?: string;        // HH:MM or undefined
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
}

export interface EventExtractionResult {
  events: ParsedEvent[];
  needs_clarification: boolean;
  clarification_question?: string;
  intent_type: 'calendar_event' | 'reminder' | 'unknown';
}

/**
 * Generate dynamic context for the Event Extractor prompt
 */
function getEventExtractorContext(): string {
  const now = new Date();
  const timezone = APP_CONFIG.localization.timezone;
  
  // Format current time in user's timezone
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
  
  return `# Critical Context
- **Current Time:** ${currentISOTimestamp} (${timezone})
- **User Timezone:** ${timezone}
- **Today is:** ${dayOfWeek}, ${currentDate}`;
}

/**
 * Build the Event Extractor system prompt
 */
function buildEventExtractorPrompt(): string {
  const context = getEventExtractorContext();
  
  return `# Role
You are the "Event Extractor," an intelligent assistant for a family calendar app. Parse user intent into structured calendar data from voice transcripts, image descriptions, or text.

${context}

# Processing Rules

## 1. Date Resolution
- Convert relative terms ("next Tuesday", "tomorrow afternoon") into absolute dates
- "Tonight" = 19:00 unless context implies otherwise
- "Morning" = 09:00, "Afternoon" = 14:00, "Evening" = 19:00
- "Lunch" = 12:00, "Dinner" = 19:00, "Breakfast" = 08:00
- If no duration mentioned: default 60 minutes for events
- "tomorrow" = next day, "Friday" = next Friday from today

## 2. Handling Missing Info
- If intent is clear but time is missing for time-sensitive events, set needs_clarification: true
- If user says "Lunch with Mom" without date, assume TODAY if before 11:00, otherwise TOMORROW
- For "Note to self: buy milk", treat as reminder, NOT calendar event

## 3. Multi-Turn Understanding
- CRITICAL: If user confirms with "ja", "yes", "alle", "all", "okay", etc., extract ALL events mentioned in conversation history!
- Look at previous messages to understand what confirmations refer to

## 4. Family Context
- Extract family member names (Emma, Max, Mirka, Mara, Julia, Hanna, etc.)
- "mit Mama" / "with Mom" → family_member: "Mama"
- "für die Kinder" / "for the kids" → family_member: "Kinder"

# Output Schema (JSON Only)
Respond with ONLY valid JSON, no markdown:

{
  "intent_type": "calendar_event" | "reminder" | "unknown",
  "has_events": boolean,
  "events": [
    {
      "title": "Short event title (max 50 chars, proper capitalization)",
      "event_date": "YYYY-MM-DD",
      "event_time": "HH:MM" or null,
      "end_time": "HH:MM" or null,
      "is_all_day": boolean,
      "family_member": "name" or null,
      "location": "place" or null,
      "description": "Original context/extra details" or null
    }
  ],
  "needs_clarification": boolean,
  "clarification_question": "Polite question in German, only if critical info missing" or null,
  "confidence": 0.0-1.0
}

If no events detected: {"intent_type": "unknown", "has_events": false, "events": [], "needs_clarification": false, "clarification_question": null, "confidence": 1.0}`;
}

export async function parseEventIntent(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ParsedEvent[] | null> {
  try {
    // Build conversation context for multi-turn understanding
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = conversationHistory 
      ? conversationHistory.slice(-6).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      : [];

    // Use the enhanced Event Extractor prompt
    const systemPrompt = buildEventExtractorPrompt();

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      max_tokens: 2000,
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return null;
    }

    console.log('[OpenAI] Event Extractor response:', responseContent);

    // Parse and Validate with enhanced Zod schema
    const parsedRaw = JSON.parse(responseContent);
    
    // Try new schema first
    const result = EventExtractorResponseSchema.safeParse(parsedRaw);
    
    if (result.success) {
      const data = result.data;
      
      // Log clarification requests for debugging
      if (data.needs_clarification && data.clarification_question) {
        console.log('[OpenAI] Clarification needed:', data.clarification_question);
        // TODO: In future, return clarification to user flow
      }
      
      if (data.has_events && data.events && data.events.length > 0) {
        console.log(`[OpenAI] Detected ${data.events.length} events (confidence: ${data.confidence || 'N/A'})`);
        return data.events.map(event => ({
          title: event.title,
          event_date: event.event_date,
          event_time: event.event_time || undefined,
          end_time: event.end_time || undefined,
          is_all_day: event.is_all_day,
          family_member: event.family_member || undefined,
          location: event.location || undefined,
          description: event.description || undefined,
        }));
      }
      
      return null;
    }
    
    // Fallback: Try legacy schemas for backwards compatibility
    console.log('[OpenAI] Trying legacy schema...');
    
    const legacyMultiResult = EventResponseSchema.safeParse(parsedRaw);
    if (legacyMultiResult.success && legacyMultiResult.data.hasEvents && legacyMultiResult.data.events) {
      return legacyMultiResult.data.events.map(event => ({
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time || undefined,
        end_time: event.end_time || undefined,
        is_all_day: event.is_all_day ?? !event.event_time,
        family_member: event.family_member || undefined,
        location: event.location || undefined,
        description: event.description || undefined,
      }));
    }
    
    const legacySingleResult = EventSchema.safeParse(parsedRaw);
    if (legacySingleResult.success && legacySingleResult.data.isEvent && legacySingleResult.data.title && legacySingleResult.data.event_date) {
      return [{
        title: legacySingleResult.data.title,
        event_date: legacySingleResult.data.event_date,
        event_time: legacySingleResult.data.event_time || undefined,
        end_time: legacySingleResult.data.end_time || undefined,
        is_all_day: legacySingleResult.data.is_all_day ?? !legacySingleResult.data.event_time,
        family_member: legacySingleResult.data.family_member || undefined,
        location: legacySingleResult.data.location || undefined,
        description: legacySingleResult.data.description || undefined,
      }];
    }
    
    console.error('[OpenAI] Event validation failed for all schemas:', result.error);
    return null;
  } catch (error) {
    console.error('[OpenAI] Event parsing error:', error);
    return null;
  }
}

/**
 * Enhanced event parsing that returns full extraction result including clarifications
 * Use this for user-facing flows where clarification questions should be surfaced
 */
export async function parseEventWithClarification(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<EventExtractionResult> {
  try {
    const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = conversationHistory 
      ? conversationHistory.slice(-6).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      : [];

    const systemPrompt = buildEventExtractorPrompt();

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      max_tokens: 2000,
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return {
        events: [],
        needs_clarification: false,
        intent_type: 'unknown',
      };
    }

    console.log('[OpenAI] Event Extractor full response:', responseContent);

    const parsedRaw = JSON.parse(responseContent);
    const result = EventExtractorResponseSchema.safeParse(parsedRaw);
    
    if (result.success) {
      const data = result.data;
      
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
      
      return {
        events,
        needs_clarification: data.needs_clarification,
        clarification_question: data.clarification_question || undefined,
        intent_type: data.intent_type,
      };
    }
    
    // Fallback for legacy response format
    console.log('[OpenAI] Trying legacy schema for clarification result...');
    const events = await parseEventIntent(message, conversationHistory);
    
    return {
      events: events || [],
      needs_clarification: false,
      intent_type: events && events.length > 0 ? 'calendar_event' : 'unknown',
    };
  } catch (error) {
    console.error('[OpenAI] Event parsing with clarification error:', error);
    return {
      events: [],
      needs_clarification: false,
      intent_type: 'unknown',
    };
  }
}
