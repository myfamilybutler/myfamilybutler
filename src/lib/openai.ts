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
 * Returns parsed event info or null if no event detected
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

export async function parseEventIntent(
  message: string
): Promise<ParsedEvent | null> {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an event parser for a family calendar app. Analyze the user message and extract event information.

If an event is detected, respond with ONLY valid JSON in this format:
{
  "isEvent": true,
  "title": "short event title",
  "event_date": "YYYY-MM-DD",
  "event_time": "HH:MM" or null,
  "end_time": "HH:MM" or null,
  "is_all_day": true/false,
  "family_member": "name" or null,
  "location": "place" or null,
  "description": "extra details" or null
}

If no event is detected, respond with ONLY:
{"isEvent": false}

Rules:
- Set is_all_day to true if NO specific time is mentioned
- event_time and end_time should be null for all-day events
- Extract family member names like "Emma", "Max", "my son", "the kids"
- Keep title short (under 50 chars)
- Location can be address, venue, or person's name (like "Dr. Smith")
- Assume Austrian timezone (${APP_CONFIG.localization.timezone})
- "tomorrow" = next day, "Friday" = next Friday

Current date for reference: ${new Date().toLocaleDateString('en-CA', { timeZone: APP_CONFIG.localization.timezone })}`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 300,
      temperature: 0,
      response_format: { type: "json_object" } // Enforce JSON mode
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return null;
    }

    // Parse and Validate with Zod
    const parsedRaw = JSON.parse(responseContent);
    const result = EventSchema.safeParse(parsedRaw);

    if (!result.success) {
      console.error('Event validation failed:', result.error);
      return null;
    }

    const data = result.data;
    
    if (data.isEvent && data.title && data.event_date) {
      return {
        title: data.title,
        event_date: data.event_date,
        event_time: data.event_time || undefined,
        end_time: data.end_time || undefined,
        is_all_day: data.is_all_day ?? !data.event_time,
        family_member: data.family_member || undefined,
        location: data.location || undefined,
        description: data.description || undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Event parsing error:', error);
    return null;
  }
}
