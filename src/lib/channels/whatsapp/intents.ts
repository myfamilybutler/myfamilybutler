/**
 * WhatsApp Intent Processing
 * 
 * Handles parsing and creating reminders/events from user messages.
 * Extracted from the main webhook route for better organization.
 */

import { sendWhatsAppMessage } from '@/lib/channels/whatsapp';
import { 
  logMessage, 
  createReminder, 
  createEvent, 
  getMessageHistory 
} from '@/lib/supabase';
import { parseReminderIntent, parseEventIntent, generateAIResponse } from '@/lib/ai';
import { APP_CONFIG } from '@/lib/config';
import type { ChatMessage } from '@/types';

interface IntentContext {
  userId: string;
  phoneNumber: string;
  householdId: string | null;
  messageId: string;
}

interface IntentResult {
  handled: boolean;
}

/**
 * Process message for reminder/event intents.
 * Falls back to AI response if no specific intent is detected.
 */
export async function processIntents(
  message: string,
  context: IntentContext
): Promise<IntentResult> {
  const { userId, phoneNumber, householdId, messageId } = context;

  // Check for reminder intent first
  const reminderIntent = await parseReminderIntent(message);

  if (reminderIntent) {
    await handleReminderIntent(reminderIntent, { userId, phoneNumber });
    return { handled: true };
  }

  // Get message history for context
  const history = await getMessageHistory(userId, 10);
  const chatHistory: ChatMessage[] = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  // Check for event intent (if user has a family)
  const eventIntents = await parseEventIntent(message, chatHistory);
  if (householdId && eventIntents && eventIntents.length > 0) {
    await handleEventIntents(eventIntents, {
      userId,
      phoneNumber,
      householdId,
      messageId,
    });
    return { handled: true };
  }

  // Fall back to AI response
  await handleAIResponse(chatHistory, message, { userId, phoneNumber });
  return { handled: true };
}

/**
 * Handle reminder intent
 */
async function handleReminderIntent(
  intent: { task: string; datetime: Date },
  { userId, phoneNumber }: { userId: string; phoneNumber: string }
): Promise<void> {
  const reminder = await createReminder(userId, intent.task, intent.datetime);

  if (reminder) {
    const formattedDate = intent.datetime.toLocaleDateString('de-AT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const confirmationMessage = `✅ Erinnerung erstellt!\n\n📋 *${intent.task}*\n📅 ${formattedDate}`;
    await sendWhatsAppMessage(phoneNumber, confirmationMessage);
    await logMessage(userId, 'assistant', confirmationMessage, 'text');
  }
}

interface EventIntent {
  title: string;
  event_date: string;
  event_time?: string | null;
  family_member?: string | null;
  location?: string | null;
  description?: string | null;
  is_all_day?: boolean;
}

interface CreatedEvent extends EventIntent {
  id: string;
}

/**
 * Handle event intents (one or more)
 */
async function handleEventIntents(
  intents: EventIntent[],
  context: IntentContext
): Promise<void> {
  const { userId, phoneNumber, householdId, messageId } = context;

  console.log(`[WhatsApp] Creating ${intents.length} event(s)`);

  const createdEvents: CreatedEvent[] = [];
  for (const eventIntent of intents) {
    const event = await createEvent(householdId!, userId, {
      title: eventIntent.title,
      event_date: eventIntent.event_date,
      event_time: eventIntent.event_time || undefined,
      is_all_day: eventIntent.is_all_day ?? !eventIntent.event_time,
      family_member: eventIntent.family_member || undefined,
      location: eventIntent.location || undefined,
      description: eventIntent.description || undefined,
      source_message_id: messageId,
    });
    if (event) {
      createdEvents.push(event as CreatedEvent);
    }
  }

  if (createdEvents.length === 0) return;

  const confirmationMessage = formatEventConfirmation(createdEvents);
  await sendWhatsAppMessage(phoneNumber, confirmationMessage);
  await logMessage(userId, 'assistant', confirmationMessage, 'text');
}

/**
 * Format event confirmation message
 */
function formatEventConfirmation(events: CreatedEvent[]): string {
  if (events.length === 1) {
    const event = events[0];
    const dateObj = new Date(event.event_date);
    const formattedDate = dateObj.toLocaleDateString(APP_CONFIG.localization.locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const timeStr = event.event_time ? ` um ${event.event_time}` : ' (ganztägig)';
    const memberStr = event.family_member ? ` für ${event.family_member}` : '';
    const locationStr = event.location ? `\n📍 ${event.location}` : '';

    return `📅 Termin erstellt!\n\n*${event.title}*${memberStr}\n🗓️ ${formattedDate}${timeStr}${locationStr}`;
  }

  // Multiple events
  const eventList = events.map((event) => {
    const dateObj = new Date(event.event_date);
    const formattedDate = dateObj.toLocaleDateString(APP_CONFIG.localization.locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = event.event_time ? ` ${event.event_time}` : '';
    return `• ${formattedDate}${timeStr} - ${event.title}`;
  }).join('\n');

  return `📅 ${events.length} Termine erstellt!\n\n${eventList}\n\n✅ Alle Termine wurden in deinem Kalender gespeichert!`;
}

/**
 * Generate and send AI response
 */
async function handleAIResponse(
  chatHistory: ChatMessage[],
  message: string,
  { userId, phoneNumber }: { userId: string; phoneNumber: string }
): Promise<void> {
  const aiResponse = await generateAIResponse(chatHistory, message);
  const sendResult = await sendWhatsAppMessage(phoneNumber, aiResponse);

  if (sendResult.success) {
    await logMessage(userId, 'assistant', aiResponse, 'text', sendResult.messageId);
    console.log('[WhatsApp] AI response sent successfully');
  } else {
    console.error('[WhatsApp] Failed to send AI response:', sendResult.error);
  }
}
