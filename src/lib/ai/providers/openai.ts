/**
 * OpenAI Provider
 * 
 * OpenAI GPT-4o integration for event parsing and chat responses.
 */

import OpenAI from 'openai';
import type { ChatMessage } from '@/types';
import type { ParsedEvent, EventExtractionResult, ParsedReminder } from '../types';
import { 
  ReminderSchema, 
  EventExtractorResponseSchema,
  SingleEventSchema,
  MultiEventSchema,
} from '../schemas';
import { logError } from '@/lib/utils/logger';
import { 
  buildEventExtractorPrompt, 
  buildReminderPrompt,
  getButlerPersonaPrompt,
} from '../prompts';

// ===========================================
// Client Initialization
// ===========================================

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// ===========================================
// Chat Response Generation
// ===========================================

/**
 * Generate an AI response based on conversation history
 */
export async function generateAIResponse(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  const openai = getOpenAI();
  const systemPrompt = getButlerPersonaPrompt();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: newMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || 'Entschuldigung, ich konnte keine Antwort generieren.';
}

// ===========================================
// Reminder Parsing
// ===========================================

/**
 * Parse a message to check if it contains a reminder request
 */
export async function parseReminderIntent(
  message: string
): Promise<ParsedReminder | null> {
  const openai = getOpenAI();
  const systemPrompt = buildReminderPrompt();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = ReminderSchema.safeParse(JSON.parse(content));
    if (!parsed.success || !parsed.data.isReminder) return null;

    if (!parsed.data.task || !parsed.data.datetime) return null;

    return {
      task: parsed.data.task,
      datetime: new Date(parsed.data.datetime),
    };
  } catch (error) {
    logError('[OpenAI] Reminder parsing error:', error);
    return null;
  }
}

// ===========================================
// Event Parsing
// ===========================================

/**
 * Parse event with clarification support
 * Full extraction result including clarification questions
 * @param familyMembers - Optional list of known family members for matching
 */
export async function parseEventWithClarification(
  message: string,
  conversationHistory?: ChatMessage[],
  familyMembers?: string[]
): Promise<EventExtractionResult> {
  const openai = getOpenAI();
  const systemPrompt = buildEventExtractorPrompt(familyMembers, message);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation context
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  }

  messages.push({ role: 'user', content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { events: [], needs_clarification: false, intent_type: 'unknown' };
    }

    const parsed = JSON.parse(content);
    const validated = EventExtractorResponseSchema.safeParse(parsed);

    if (validated.success) {
      const events: ParsedEvent[] = (validated.data.events || []).map((e) => {
        const event: ParsedEvent = {
          title: e.title,
          event_date: e.event_date,
          event_time: e.event_time ?? undefined,
          end_time: e.end_time ?? undefined,
          is_all_day: e.is_all_day,
          family_member: e.family_member ?? undefined,
          location: e.location ?? undefined,
          description: e.description ?? undefined,
          is_cancelled: e.is_cancelled ?? undefined,
          requires_confirmation: e.requires_confirmation ?? undefined,
          action_items: e.action_items ?? undefined,
        };

        if (e.recurrence?.is_recurring) {
          event.recurrence = {
            frequency: e.recurrence.frequency,
            interval: e.recurrence.interval,
            by_day: e.recurrence.by_day,
            is_recurring: true,
          };
        }

        return event;
      });

      return {
        events,
        needs_clarification: validated.data.needs_clarification,
        clarification_question: validated.data.clarification_question ?? undefined,
        intent_type: validated.data.intent_type,
        confidence: validated.data.confidence,
        action_items: validated.data.action_items ?? undefined,
      };
    }

    // Fallback: Try legacy schemas
    return tryLegacyParsing(parsed);
  } catch (error) {
    logError('[OpenAI] Event parsing error:', error);
    return { events: [], needs_clarification: false, intent_type: 'unknown' };
  }
}

/**
 * Simple event parsing (backwards compatible)
 * Returns just events array or null
 */
export async function parseEventIntent(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ParsedEvent[] | null> {
  const result = await parseEventWithClarification(message, conversationHistory);
  return result.events.length > 0 ? result.events : null;
}

// ===========================================
// Legacy Parsing Helpers
// ===========================================

function tryLegacyParsing(parsed: unknown): EventExtractionResult {
  // Try single event
  const singleResult = SingleEventSchema.safeParse(parsed);
  if (singleResult.success) {
    return {
      events: [{
        title: singleResult.data.title,
        event_date: singleResult.data.event_date,
        event_time: singleResult.data.event_time ?? undefined,
        end_time: singleResult.data.end_time ?? undefined,
        is_all_day: singleResult.data.is_all_day,
        family_member: singleResult.data.family_member ?? undefined,
        location: singleResult.data.location ?? undefined,
        description: singleResult.data.description ?? undefined,
      }],
      needs_clarification: false,
      intent_type: 'calendar_event',
    };
  }

  // Try multi-event
  const multiResult = MultiEventSchema.safeParse(parsed);
  if (multiResult.success) {
    const events: ParsedEvent[] = multiResult.data.events.map((e) => ({
      title: e.title,
      event_date: e.event_date,
      event_time: e.event_time ?? undefined,
      end_time: e.end_time ?? undefined,
      is_all_day: e.is_all_day ?? false,
      family_member: e.family_member ?? undefined,
      location: e.location ?? undefined,
      description: e.description ?? undefined,
    }));
    return { events, needs_clarification: false, intent_type: 'calendar_event' };
  }

  return { events: [], needs_clarification: false, intent_type: 'unknown' };
}
