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
  getFamilyMembers,
} from '@/lib/supabase';
import { parseReminderIntent } from '@/lib/ai/providers/openai';
import { parseEventWithFallback, generateResponseWithFallback } from '@/lib/ai';
import { sendWhatsAppMessage, sendInteractiveMessage, type QuickReplyButton } from './whatsapp';
import { sendTelegramMessage, requestPhoneNumber, removeKeyboard } from './telegram';
import { send360DialogMessage, send360DialogInteractiveMessage } from './three-sixty-dialog';
import {
  detectLanguage,
  getTemplate,
  formatDateForLanguage,
  formatDateTimeForLanguage,
} from '@/lib/ai/response-templates';
import { trackMessage, trackEventCreated, trackUserSignup, identifyUser } from '@/lib/analytics';
import { logAIInteraction } from '@/lib/ai/logging';

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
  } else if (channel === '360dialog') {
    return send360DialogMessage(phoneNumber, text);
  } else {
    return sendWhatsAppMessage(phoneNumber, text);
  }
}

/**
 * Send response with Quick Reply buttons (WhatsApp/360dialog only, text fallback for Telegram)
 */
async function sendInteractiveResponse(
  phoneNumber: string,
  text: string,
  buttons: QuickReplyButton[],
  channel: MessageChannel,
  telegramChatId?: number
): Promise<{ success: boolean; messageId?: string }> {
  // Telegram doesn't support inline quick replies in same way, use text fallback
  if (channel === 'telegram' && telegramChatId) {
    const result = await sendTelegramMessage(telegramChatId, text);
    return {
      success: result.success,
      messageId: result.messageId?.toString(),
    };
  } else if (channel === '360dialog') {
    return send360DialogInteractiveMessage(phoneNumber, text, buttons);
  } else {
    return sendInteractiveMessage(phoneNumber, text, buttons);
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

      // Send with Quick Reply buttons
      const welcomeButtons: QuickReplyButton[] = lang === 'de' 
        ? [{ id: 'help', title: '❓ Wie funktioniert?' }]
        : [{ id: 'help', title: '❓ How does it work?' }];

      await sendInteractiveResponse(phoneNumber, welcomeMessage, welcomeButtons, channel, telegramChatId);

      // Log welcome message
      await logMessage(user.id, 'assistant', welcomeMessage, 'text', undefined, channel);

      // Don't process the initial message as a command - they're just saying hi
      // Log the user message and return
      await logMessage(user.id, 'user', userMessage, messageType, messageId, channel);
      
      // Track signup and first message in PostHog
      trackUserSignup(user.id, channel, lang);
      identifyUser(user.id, { 
        phone_number: phoneNumber, 
        signup_source: channel,
        language: lang,
        created_at: new Date().toISOString(),
      });
      trackMessage(user.id, 'first_message', channel, true);
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

    // Handle special commands (dashboard, help, start) for channels using shared processor
    const commandHandled = await handleSharedCommand(
      userMessage.toLowerCase().trim(),
      user.id,
      phoneNumber,
      channel,
      telegramChatId
    );
    if (commandHandled) {
      return;
    }

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
        
        // Track reminder creation
        trackEventCreated(user.id, 'reminder', channel);
        return;
      }
    }

    // Get message history and family members in parallel for efficiency
    const [history, familyMemberData] = await Promise.all([
      getMessageHistory(user.id, 10),
      currentHouseholdId 
        ? getFamilyMembers(currentHouseholdId) 
        : Promise.resolve({ familyMembers: [], users: [] })
    ]);

    const chatHistory: ChatMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const familyMemberNames = familyMemberData.familyMembers.map(m => m.name);

    // Use AI router with fallback and clarification support
    const extractionResult = await parseEventWithFallback(userMessage, chatHistory, familyMemberNames);

    // Log AI interaction for observability
    const intentDetected = extractionResult.needs_clarification 
      ? 'clarification' 
      : extractionResult.events.length > 0 
        ? 'create_event' 
        : extractionResult.intent_type || 'chat';

    // Fire-and-forget logging (don't block response)
    logAIInteraction(
      {
        userId: user.id,
        channel,
        userMessage,
        messageType,
        contextMessageCount: history.length,
        familyMembers: familyMemberNames,
      },
      {
        promptVersion: extractionResult._meta?.promptVersion || 'event-v1.0',
        model: extractionResult._meta?.model || 'unknown',
        aiOutput: extractionResult,
        intentDetected,
        eventsExtracted: extractionResult.events.length,
        actionTaken: intentDetected === 'clarification' ? 'clarification_sent' : 
                     extractionResult.events.length > 0 ? 'event_created' : 'response_sent',
        wasSuccessful: true,
        latencyMs: extractionResult._meta?.latencyMs || 0,
      }
    ).catch(err => console.error('[AI Logging] Background log failed:', err));

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

        // Send with Quick Reply buttons for dashboard and new event
        const confirmButtons: QuickReplyButton[] = lang === 'de'
          ? [
              { id: 'dashboard', title: '📅 Kalender' },
              { id: 'new_event', title: '➕ Neuer Termin' },
            ]
          : [
              { id: 'dashboard', title: '📅 Calendar' },
              { id: 'new_event', title: '➕ New Event' },
            ];

        await sendInteractiveResponse(phoneNumber, confirmationMessage, confirmButtons, channel, telegramChatId);
        await logMessage(user.id, 'assistant', confirmationMessage, 'text', undefined, channel);
        
        // Track event creation(s)
        createdEvents.forEach(() => trackEventCreated(user.id, 'event', channel));
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

// ===========================================
// Shared Command Handler (for 360dialog and others)
// ===========================================

async function handleSharedCommand(
  lowerMessage: string,
  userId: string,
  phoneNumber: string,
  channel: MessageChannel,
  telegramChatId?: number
): Promise<boolean> {
  // Dashboard/login command
  if (['dashboard', 'link', 'login'].includes(lowerMessage)) {
    console.log(`[${channel.toUpperCase()}] Dashboard command from ${phoneNumber}`);
    
    const { generateDashboardLink } = await import('@/lib/supabase');
    const result = await generateDashboardLink(phoneNumber, channel);

    if (result.success && result.link) {
      const dashboardMessage =
        `🔗 *Dein sicherer Dashboard-Link*\n\n` +
        `Klicke auf den folgenden Link, um dein Dashboard zu öffnen:\n\n` +
        `${result.link}\n\n` +
        `⏱️ Der Link ist 15 Minuten gültig.`;

      await sendResponse(phoneNumber, dashboardMessage, channel, telegramChatId);
      await logMessage(userId, 'assistant', dashboardMessage, 'text', undefined, channel);
    } else {
      const errorMessage = `❌ Fehler: ${result.error || 'Unbekannter Fehler'}`;
      await sendResponse(phoneNumber, errorMessage, channel, telegramChatId);
      await logMessage(userId, 'assistant', errorMessage, 'text', undefined, channel);
    }
    return true;
  }

  // Start/hello command
  if (['start', 'hallo', 'hi', 'hello'].includes(lowerMessage)) {
    const welcomeMessage =
      `👋 *Willkommen bei My Family Butler!*\n\n` +
      `Ich bin dein persönlicher Familienassistent. Ich kann dir helfen mit:\n\n` +
      `📅 *Termine erstellen* - "Zahnarzt am Montag um 10 Uhr"\n` +
      `⏰ *Erinnerungen* - "Erinnere mich morgen an Milch kaufen"\n` +
      `🔗 *Dashboard öffnen* - "Dashboard" oder "Link"\n\n` +
      `Probiere es aus! Schreib mir einfach eine Nachricht.`;

    await sendResponse(phoneNumber, welcomeMessage, channel, telegramChatId);
    await logMessage(userId, 'assistant', welcomeMessage, 'text', undefined, channel);
    return true;
  }

  // Help command
  if (['help', 'hilfe', '?'].includes(lowerMessage)) {
    const helpMessage =
      `ℹ️ *My Family Butler Hilfe*\n\n` +
      `*Termine:*\n` +
      `• "Zahnarzt am Montag um 10 Uhr"\n` +
      `• "Meeting morgen 14:00"\n\n` +
      `*Erinnerungen:*\n` +
      `• "Erinnere mich in 1 Stunde an..."\n` +
      `• "Reminder: Milch kaufen morgen"\n\n` +
      `*Befehle:*\n` +
      `• dashboard - Dashboard öffnen\n` +
      `• help - Diese Hilfe anzeigen`;

    await sendResponse(phoneNumber, helpMessage, channel, telegramChatId);
    await logMessage(userId, 'assistant', helpMessage, 'text', undefined, channel);
    return true;
  }

  return false;
}

