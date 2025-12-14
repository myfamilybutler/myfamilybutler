// ===========================================
// OpenAI Integration
// ===========================================
import OpenAI from 'openai';
import type { ChatMessage } from '@/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the Family Butler
const SYSTEM_PROMPT = `You are "Family Butler" - a helpful, friendly AI assistant that lives on WhatsApp to help Austrian families manage their daily lives.

Your personality:
- Warm, professional, and reliable like a trusted family butler
- Speaks naturally in German (Austrian dialect welcome) or English based on user preference
- Concise but thorough - respect that people are busy
- Has a touch of Austrian charm

Your capabilities:
1. **Reminders & Scheduling**: Help set reminders for appointments, school events, bills, etc.
2. **Document Reading**: When users send images (like school letters, forms, or bills), summarize the key information
3. **Quick Answers**: Answer questions about local Austrian services, regulations, or general knowledge
4. **To-Do Management**: Help organize tasks and priorities
5. **Family Coordination**: Help coordinate schedules between family members

Important rules:
- If the user asks to set a reminder, extract the date/time and task clearly
- For images/documents, focus on extracting actionable information (dates, amounts, deadlines)
- Keep responses WhatsApp-friendly: use emojis sparingly, keep messages under 500 chars when possible
- If you're unsure about something, ask for clarification
- Always prioritize privacy - never ask for unnecessary personal information
- When mentioning times, assume Austrian timezone (CET/CEST)

Respond in the same language the user writes to you in.`;

/**
 * Generate an AI response based on conversation history and new message
 */
export async function generateAIResponse(
  history: ChatMessage[],
  newMessage: string
): Promise<string> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: newMessage },
    ];

    const completion = await openai.chat.completions.create({
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
 * Analyze an image and extract key information
 */
export async function analyzeImage(
  imageUrl: string,
  userPrompt?: string
): Promise<string> {
  try {
    const prompt = userPrompt || 
      'Analyze this document/image and extract the key information. Focus on: dates, deadlines, amounts, and any required actions. Summarize in a clear, actionable format.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    return responseContent;
  } catch (error) {
    console.error('OpenAI Vision API error:', error);
    return 'Ich konnte das Bild leider nicht analysieren. Könnten Sie bitte die wichtigsten Details manuell eingeben? 📝';
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
    const completion = await openai.chat.completions.create({
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
- Assume Austrian timezone (Europe/Vienna)
- "tomorrow" means the next day at 9:00 AM
- "in X hours" means current time + X hours
- If time is ambiguous, assume 9:00 AM

Current date/time for reference: ${new Date().toISOString()}`,
        },
        { role: 'user', content: message },
      ],
      max_tokens: 200,
      temperature: 0,
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return null;
    }

    const parsed = JSON.parse(responseContent);
    
    if (parsed.isReminder && parsed.task && parsed.datetime) {
      return {
        task: parsed.task,
        datetime: new Date(parsed.datetime),
      };
    }

    return null;
  } catch (error) {
    console.error('Reminder parsing error:', error);
    return null;
  }
}
