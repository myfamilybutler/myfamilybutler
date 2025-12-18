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
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';
import { generateAIResponse, parseReminderIntent, parseEventIntent } from '@/lib/openai';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendTelegramMessage, requestPhoneNumber, removeKeyboard } from '@/lib/telegram';
import { APP_CONFIG } from '@/lib/config';

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

    // Find or create user
    const user = await findOrCreateUser(phoneNumber);

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

    // Check for pending invite and auto-link to family
    if (!user.household_id) {
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
          user.household_id = updatedUser.household_id;
        }

        await sendResponse(
          phoneNumber,
          '🎉 Willkommen bei My Family Butler! Du wurdest zur Familie hinzugefügt. Schreib mir, um Termine und Erinnerungen zu erstellen!',
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
        const formattedDate = reminderIntent.datetime.toLocaleDateString('de-AT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        const confirmationMessage = `✅ Erinnerung erstellt!\n\n📋 *${reminderIntent.task}*\n📅 ${formattedDate}`;
        await sendResponse(phoneNumber, confirmationMessage, channel, telegramChatId);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text', undefined, channel);
        return;
      }
    }

    // Check for event intent (if user has a family)
    const eventIntent = await parseEventIntent(userMessage);
    if (user.household_id && eventIntent) {
      const event = await createEvent(
        user.household_id,
        user.id,
        {
          ...eventIntent,
          source_message_id: messageId
        }
      );

      if (event) {
        const dateObj = new Date(event.event_date);
        const formattedDate = dateObj.toLocaleDateString(APP_CONFIG.localization.locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });

        const timeStr = event.event_time ? ` um ${event.event_time}` : ' (ganztägig)';
        const memberStr = event.family_member ? ` für ${event.family_member}` : '';
        const locationStr = event.location ? `\n📍 ${event.location}` : '';

        const confirmationMessage = `📅 Termin erstellt!\n\n*${event.title}*${memberStr}\n🗓️ ${formattedDate}${timeStr}${locationStr}`;
        await sendResponse(phoneNumber, confirmationMessage, channel, telegramChatId);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text', undefined, channel);
        return;
      }
    }

    // Get message history for context
    const history = await getMessageHistory(user.id, 10);

    const chatHistory: ChatMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Generate AI response
    const aiResponse = await generateAIResponse(chatHistory, userMessage);

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
