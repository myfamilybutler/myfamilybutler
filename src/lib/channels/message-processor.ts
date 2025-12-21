// ===========================================
// Shared Message Processing Logic
// ===========================================
// Used by both WhatsApp and Telegram webhooks

import type { ChatMessage, MessageChannel } from '@/types';
import {
  findOrCreateUser,
  logMessage,
  getMessageHistory,
  checkPendingInvite,
  acceptInvite,
  createReminder,
  createEvent,
  getAdminClient,
} from '@/lib/supabase';
import { parseReminderIntent } from '@/lib/ai/providers/openai';
import { parseEventWithFallback, generateResponseWithFallback } from '@/lib/ai';
import { sendWhatsAppMessage } from './whatsapp';
import { sendTelegramMessage, requestPhoneNumber, removeKeyboard } from './telegram';
import {
  detectLanguage,
  getTemplate,
  formatDateForLanguage,
  formatDateTimeForLanguage,
} from '@/lib/ai/response-templates';

// ===========================================
// Types
// ===========================================

export interface ProcessMessageInput {
  phoneNumber: string;          // Phone number (required for both channels)
  userMessage: string;
  messageType: 'text' | 'image' | 'voice';
  messageId: string;
  contactName?: string;
  channel: MessageChannel;
  telegramChatId?: number;      // Required for Telegram responses
}

// ===========================================
// Send Response (Channel-Agnostic)
// ===========================================

async function sendResponse(
  phoneNumber: string,
  text: string,
  channel: MessageChannel,
  telegramChatId?: number
): Promise<{ success: boolean; messageId?: string }> {
  if (channel === 'telegram' && telegramChatId) {
    const result = await sendTelegramMessage(telegramChatId, text);
    return {
      success: result.success,
      messageId: result.messageId?.toString(),
    };
  } else {
    return sendWhatsAppMessage(phoneNumber, text);
  }
}

// ===========================================
// Main Message Processor
// ===========================================

export async function processIncomingMessage(
  input: ProcessMessageInput
): Promise<void> {
  const {
    phoneNumber,
    userMessage,
    messageType,
    messageId,
    contactName,
    channel,
    telegramChatId,
  } = input;

  try {
    console.log(`[${channel.toUpperCase()}] Processing message from ${phoneNumber} (${contactName || 'Unknown'})`);
    console.log(`[${channel.toUpperCase()}] Message content: "${userMessage}" (${messageType})`);

    // Find or create user (returns isNewUser flag for welcome message)
    const { user, isNewUser } = await findOrCreateUser(phoneNumber, channel);

    if (!user) {
      console.error(`[${channel.toUpperCase()}] Failed to find/create user: ${phoneNumber}`);
      await sendResponse(
        phoneNumber,
        'Sorry, there was an error. Please try again later.',
        channel,
        telegramChatId
      );
      return;
    }

    // Send welcome message to brand new users (before any other processing)
    if (isNewUser) {
      console.log(`[${channel.toUpperCase()}] New user detected, sending welcome message`);
      // Detect language from first message for welcome
      const lang = detectLanguage(userMessage);
      const welcomeMessage = getTemplate('welcome', lang);

      await sendResponse(phoneNumber, welcomeMessage, channel, telegramChatId);

      // Log welcome message
      await logMessage(user.id, 'assistant', welcomeMessage, 'text', undefined, channel);

      // Don't process the initial message as a command - they're just saying hi
      // Log the user message and return
      await logMessage(user.id, 'user', userMessage, messageType, messageId, channel);
      return;
    }

    // Check for pending invite and auto-link to family
    let currentHouseholdId = user.household_id;
    if (!currentHouseholdId) {
      const pendingInvite = await checkPendingInvite(phoneNumber);
      if (pendingInvite) {
        console.log(`[${channel.toUpperCase()}] Auto-linking user ${phoneNumber} to family`);
        await acceptInvite(user.id, pendingInvite.inviteId, pendingInvite.householdId);

        const admin = getAdminClient();
        const { data: updatedUser } = await admin
          .from('users')
          .select('household_id')
          .eq('id', user.id)
          .single();

        if (updatedUser) {
          currentHouseholdId = updatedUser.household_id;
        }

        const lang = detectLanguage(userMessage);
        await sendResponse(
          phoneNumber,
          getTemplate('linkedToFamily', lang),
          channel,
          telegramChatId
        );
      }
    }

    // Log user message
    await logMessage(user.id, 'user', userMessage, messageType, messageId, channel);

    // Check for reminder intent
    const reminderIntent = await parseReminderIntent(userMessage);

    if (reminderIntent) {
      const reminder = await createReminder(
        user.id,
        reminderIntent.task,
        reminderIntent.datetime
      );

      if (reminder) {
        const lang = detectLanguage(userMessage);
        const formattedDate = formatDateTimeForLanguage(reminderIntent.datetime, lang);

        const template = getTemplate('reminderCreated', lang);
        const confirmationMessage = template
          .replace('{task}', reminderIntent.task)
          .replace('{datetime}', formattedDate);
        await sendResponse(phoneNumber, confirmationMessage, channel, telegramChatId);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text', undefined, channel);
        return;
      }
    }

    // Check for event intent (if user has a family)
    // Get message history for context (needed for multi-turn understanding)
    const history = await getMessageHistory(user.id, 10);
    const chatHistory: ChatMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Use AI router with fallback and clarification support
    const extractionResult = await parseEventWithFallback(userMessage, chatHistory);

    // Handle clarification requests from AI
    if (extractionResult.needs_clarification && extractionResult.clarification_question) {
      console.log(`[${channel.toUpperCase()}] AI needs clarification: ${extractionResult.clarification_question}`);

      const clarificationMessage = `🤔 ${extractionResult.clarification_question}`;
      await sendResponse(phoneNumber, clarificationMessage, channel, telegramChatId);
      await logMessage(user.id, 'assistant', clarificationMessage, 'text', undefined, channel);
      return;
    }

    // Process detected events
    if (currentHouseholdId && extractionResult.events.length > 0) {
      console.log(`[${channel.toUpperCase()}] Creating ${extractionResult.events.length} event(s)`);

      const createdEvents = [];
      for (const eventIntent of extractionResult.events) {
        const event = await createEvent(
          currentHouseholdId!, // Asserted: checked in condition above
          user.id,
          {
            ...eventIntent,
            source_message_id: messageId
          }
        );
        if (event) {
          createdEvents.push(event);
        }
      }

      if (createdEvents.length > 0) {
        let confirmationMessage: string;
        const lang = detectLanguage(userMessage);

        if (createdEvents.length === 1) {
          // Single event - detailed message
          const event = createdEvents[0];
          const dateObj = new Date(event.event_date);
          const formattedDate = formatDateForLanguage(dateObj, lang);

          const timeStr = event.event_time
            ? (lang === 'de' ? ` um ${event.event_time}` : ` at ${event.event_time}`)
            : (lang === 'de' ? ' (ganztägig)' : ' (all day)');
          const memberStr = event.family_member
            ? (lang === 'de' ? ` für ${event.family_member}` : ` for ${event.family_member}`)
            : '';
          const locationStr = event.location ? `\n📍 ${event.location}` : '';

          const template = getTemplate('eventCreatedSingle', lang);
          confirmationMessage = template
            .replace('{title}', event.title)
            .replace('{memberStr}', memberStr)
            .replace('{date}', formattedDate)
            .replace('{timeStr}', timeStr)
            .replace('{locationStr}', locationStr);
        } else {
          // Multiple events - summary message
          const locale = lang === 'de' ? 'de-AT' : 'en-US';
          const eventList = createdEvents.map(event => {
            const dateObj = new Date(event.event_date);
            const formattedDate = dateObj.toLocaleDateString(locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            const timeStr = event.event_time ? ` ${event.event_time}` : '';
            return `• ${formattedDate}${timeStr} - ${event.title}`;
          }).join('\n');

          const template = getTemplate('eventCreatedMultiple', lang);
          confirmationMessage = template
            .replace('{count}', String(createdEvents.length))
            .replace('{eventList}', eventList);
        }

        await sendResponse(phoneNumber, confirmationMessage, channel, telegramChatId);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text', undefined, channel);
        return;
      }
    }

    // Generate AI response with fallback (using already-fetched history)
    const aiResponse = await generateResponseWithFallback(chatHistory, userMessage);

    // Send response
    const sendResult = await sendResponse(phoneNumber, aiResponse, channel, telegramChatId);

    if (sendResult.success) {
      await logMessage(user.id, 'assistant', aiResponse, 'text', sendResult.messageId, channel);
      console.log(`[${channel.toUpperCase()}] Response sent successfully`);
    } else {
      console.error(`[${channel.toUpperCase()}] Failed to send response`);
    }
  } catch (err) {
    console.error(`[${channel.toUpperCase()}] Critical error processing message:`, err);
  }
}

// ===========================================
// Telegram Phone Number Request Handler
// ===========================================

export async function handleTelegramPhoneRequest(
  chatId: number
): Promise<void> {
  await requestPhoneNumber(chatId);
}

export async function handleTelegramPhoneReceived(
  chatId: number,
  phoneNumber: string,
  firstName: string
): Promise<void> {
  // Remove the keyboard and confirm
  await removeKeyboard(
    chatId,
    `✅ Danke, ${firstName}! Deine Nummer wurde gespeichert. Du kannst mir jetzt Nachrichten schicken, um Termine und Erinnerungen zu erstellen! 📅`
  );
}
