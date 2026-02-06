/**
 * Processing Pipeline - Simplified
 *
 * Orchestrates message processing through discrete steps.
 * Converted from class to functions for simplicity.
 */

import type {
  PipelineContext,
  PipelineResult,
  StandardMessage,
} from './types';
import { getAdapter } from './gateway';
import {
  clearConversationState,
  setUndoState,
  setDraftPendingState,
  setClarifyingState,
} from './state';
import { parseEventWithFallback, generateResponseWithFallback } from '@/lib/ai';
import { processInput as processBrain } from '@/lib/ai/brain';
import { AI_DECISION_THRESHOLDS } from '@/lib/ai/constants';
import {
  createEvent,
  createEventsBulk,
  createDraftEvent,
  confirmDraftEvent,
  rejectDraftEvent,
  getDraftEvent,
  deleteEvent,
  getMessageHistory,
  generateDashboardLinkForUser,
  generateDashboardLink,
  createEventReminder,
} from '@/lib/supabase';
import { detectLanguage, getTemplate, formatDateForLanguage } from '@/lib/ai/response-templates';
import { logAIInteraction } from '@/lib/ai/logging';
import type { ChatMessage } from '@/types';
import type { MessagingChannel } from './types';
import type { BrainResult } from '@/lib/ai/types';
import { resolveConfirmationIntent } from '@/lib/ai/confirmation-resolver';

const COMMANDS = {
  dashboard: ['dashboard', 'link', 'login'],
  help: ['help', 'hilfe', '?'],
  start: ['start', 'hallo', 'hi', 'hello'],
  undo: ['undo', 'rückgängig', 'rückgängig machen', 'zurück'],
};

/**
 * Create a default 30-minute reminder for an event
 */
async function createDefaultReminder(
  event: { id: string; title: string; event_date: string; event_time?: string | null; is_all_day: boolean },
  userId: string
): Promise<void> {
  // Don't create reminders for all-day events
  if (event.is_all_day) return;
  
  // Don't create reminders if no specific time
  if (!event.event_time) return;

  try {
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    const reminderTime = new Date(eventDateTime.getTime() - 30 * 60 * 1000); // 30 minutes before
    
    // Only create reminder if it's in the future
    if (reminderTime > new Date()) {
      await createEventReminder(
        userId,
        event.id,
        event.title,
        reminderTime,
        `⏰ Erinnerung: "${event.title}" in 30 Minuten`
      );
      console.log(`[Reminder] Created 30-min reminder for event "${event.title}"`);
    }
  } catch (error) {
    console.error('[Reminder] Failed to create default reminder:', error);
    // Non-critical error - don't block event creation
  }
}

/**
 * SMART_AI_V2: Fuzzy command matching
 * Supports exact matches and natural language variants
 */
function matchCommand(text: string): keyof typeof COMMANDS | null {
  const lower = text.toLowerCase().trim();

  // Exact match first (fast path)
  for (const [command, patterns] of Object.entries(COMMANDS)) {
    if (patterns.includes(lower)) {
      return command as keyof typeof COMMANDS;
    }
  }

  // Contains matching for natural variants
  // "help me please" → help, "open dashboard" → dashboard
  for (const [command, patterns] of Object.entries(COMMANDS)) {
    if (patterns.some(p => lower.includes(p))) {
      return command as keyof typeof COMMANDS;
    }
  }

  // Additional natural language patterns
  const naturalPatterns: Record<keyof typeof COMMANDS, RegExp[]> = {
    dashboard: [/show.*dashboard/i, /open.*calendar/i, /my.*events/i, /öffne.*kalender/i],
    help: [/how.*work/i, /what.*can.*do/i, /wie.*funktioniert/i, /was.*kannst/i],
    start: [/^hey$/i, /^good morning$/i, /^guten morgen$/i],
    undo: [/take.*back/i, /remove.*last/i, /mach.*rückgängig/i, /lösch.*letzten/i],
  };

  for (const [command, regexes] of Object.entries(naturalPatterns)) {
    if (regexes.some(r => r.test(lower))) {
      return command as keyof typeof COMMANDS;
    }
  }

  return null;
}

export async function processMessage(context: PipelineContext): Promise<PipelineResult> {
  const { message, conversationState, startTime, requestId } = context;

  try {
    console.log(`[Pipeline:${requestId}] Processing ${message.type} message`);

    if (message.isNewUser) {
      return handleNewUser(context);
    }

    if (conversationState.state !== 'idle') {
      const stateResult = await handleStatefulFlow(context);
      if (stateResult) {
        return stateResult;
      }
    }

    const command = message.content ? matchCommand(message.content) : null;
    if (command) {
      return handleCommand(command, context);
    }

    return processWithBrain(context);

  } catch (error) {
    console.error(`[Pipeline:${requestId}] Error:`, error);

    return {
      response: {
        text: getTemplate('genericProcessingError', 'de'),
        metadata: { language: 'de', shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}

async function handleNewUser(context: PipelineContext): Promise<PipelineResult> {
  const { message, startTime } = context;
  const lang = message.content ? detectLanguage(message.content) : 'de';

  const welcomeMessage = getTemplate('welcome', lang);

  return {
    response: {
      text: welcomeMessage,
      buttons: lang === 'de'
        ? [{ id: 'help', title: 'Wie funktioniert?' }]
        : [{ id: 'help', title: 'How does it work?' }],
      metadata: { language: lang, shouldLog: true },
    },
    eventsCreated: 0,
    success: true,
    latencyMs: Date.now() - startTime,
  };
}

async function handleStatefulFlow(
  context: PipelineContext
): Promise<PipelineResult | null> {
  const { message, conversationState } = context;
  const content = message.content?.toLowerCase().trim() || '';

  switch (conversationState.state) {
    case 'draft_pending':
      return handleDraftPending(context, content);

    case 'awaiting_undo':
      return handleAwaitingUndo(context, content);

    case 'clarifying':
      return null;

    default:
      return null;
  }
}

async function handleDraftPending(
  context: PipelineContext,
  content: string
): Promise<PipelineResult | null> {
  const { message, conversationState, startTime } = context;
  const lang = detectLanguage(content);

  // Need draft ID and household to proceed
  if (!conversationState.draftEventId || !message.householdId) {
    await clearConversationState(message.userId, message.channel);
    return {
      response: {
        text: lang === 'de'
          ? 'Entschuldigung, der Entwurf konnte nicht gefunden werden. Bitte erstelle den Termin erneut.'
          : 'Sorry, the draft could not be found. Please create the event again.',
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Fetch the draft details
  const draft = await getDraftEvent(conversationState.draftEventId, message.householdId);
  if (!draft) {
    await clearConversationState(message.userId, message.channel);
    return {
      response: {
        text: lang === 'de'
          ? 'Der Entwurf wurde nicht mehr gefunden. Bitte erstelle den Termin erneut.'
          : 'The draft was not found. Please create the event again.',
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Use AI to understand user's intent
  const history = await getMessageHistory(message.userId, 5);
  const chatHistory: { role: 'user' | 'assistant'; content: string }[] = history
    .slice(-3)
    .map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

  const intentResult = await resolveConfirmationIntent(
    content,
    {
      title: draft.title,
      event_date: draft.event_date,
      event_time: draft.event_time,
      is_all_day: draft.is_all_day,
      family_member: draft.family_member,
      location: draft.location,
    },
    chatHistory
  );

  console.log(`[Pipeline] Draft confirmation intent: ${intentResult.intent}`);

  switch (intentResult.intent) {
    case 'confirm': {
      const event = await confirmDraftEvent(
        conversationState.draftEventId,
        message.householdId,
        message.userId
      );

      await clearConversationState(message.userId, message.channel);

      if (event) {
        await createDefaultReminder(event, message.userId);
        const dashboardLink = await getDashboardLink(message);
        return {
          response: {
            text: lang === 'de'
              ? `Termin "${event.title}" wurde gespeichert!\n\n⏰ Ich erinnere dich 30 Minuten vorher.`
              : `Event "${event.title}" saved!\n\n⏰ I'll remind you 30 minutes before.`,
            urlButton: dashboardLink ? { title: 'Dashboard', url: dashboardLink } : undefined,
            metadata: { language: lang, shouldLog: true },
          },
          eventsCreated: 1,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        response: {
          text: lang === 'de'
            ? 'Entschuldigung, beim Speichern ist ein Fehler aufgetreten.'
            : 'Sorry, an error occurred while saving.',
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: false,
        latencyMs: Date.now() - startTime,
      };
    }

    case 'reject': {
      await rejectDraftEvent(conversationState.draftEventId, message.householdId);
      await clearConversationState(message.userId, message.channel);

      return {
        response: {
          text: getTemplate('draftDiscarded', lang),
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    }

    case 'modify': {
      // Keep the draft state and ask what to change
      const modifyResponse = intentResult.response || (lang === 'de'
        ? 'Was möchtest du ändern?'
        : 'What would you like to change?');

      return {
        response: {
          text: modifyResponse,
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    }

    case 'modify_specific': {
      // User made a direct modification - apply it and show updated draft
      // For now, ask for confirmation of the interpreted change
      const modification = intentResult.modifications?.[0];
      const modifyText = modification
        ? (lang === 'de'
          ? `Verstanden! Ich ändere ${modification.field} auf "${modification.newValue}". Stimmt das?`
          : `Got it! I'll change ${modification.field} to "${modification.newValue}". Is that correct?`)
        : (lang === 'de'
          ? 'Ich habe die Änderung verstanden. Soll ich den aktualisierten Termin speichern?'
          : 'I understood the change. Should I save the updated event?');

      return {
        response: {
          text: modifyText,
          buttons: [
            { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
            { id: 'modify', title: lang === 'de' ? 'Nochmal ändern' : 'Change again' },
          ],
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    }

    case 'clarify':
    case 'unclear': {
      // Stay in draft state and respond naturally
      const clarifyResponse = intentResult.response || (lang === 'de'
        ? 'Soll ich den Termin speichern oder möchtest du etwas ändern?'
        : 'Should I save the event or would you like to change something?');

      return {
        response: {
          text: clarifyResponse,
          buttons: [
            { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
            { id: 'reject', title: lang === 'de' ? 'Nein, verwerfen' : 'No, discard' },
          ],
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    }

    case 'new_event': {
      // User is describing a different event - clear state and process as new
      await clearConversationState(message.userId, message.channel);
      return null; // Continue to normal processing
    }

    default: {
      await clearConversationState(message.userId, message.channel);
      return null;
    }
  }
}

async function handleAwaitingUndo(
  context: PipelineContext,
  content: string
): Promise<PipelineResult | null> {
  const { message, conversationState, startTime } = context;

  if (COMMANDS.undo.some(c => content.includes(c))) {
    if (conversationState.undoableEventId && message.householdId) {
      const deleted = await deleteEvent(
        conversationState.undoableEventId,
        message.householdId,
        message.userId
      );

      await clearConversationState(message.userId, message.channel);

      if (deleted) {
        return {
          response: {
            text: getTemplate('undoSuccess', 'de'),
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }
    }
  }

  await clearConversationState(message.userId, message.channel);
  return null;
}

async function handleCommand(
  command: keyof typeof COMMANDS,
  context: PipelineContext
): Promise<PipelineResult> {
  const { startTime } = context;

  switch (command) {
    case 'dashboard':
      return handleDashboardCommand(context);

    case 'help':
      return {
        response: {
          text: getTemplate('help', 'de'),
          metadata: { language: 'de', shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };

    case 'start':
      return {
        response: {
          text: getTemplate('startWelcome', 'de'),
          metadata: { language: 'de', shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };

    case 'undo':
      return {
        response: {
          text: getTemplate('noActionPending', 'de'),
          metadata: { language: 'de', shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };

    default:
      return {
        response: {
          text: getTemplate('unknownCommand', 'de'),
          metadata: { language: 'de', shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };
  }
}

async function handleDashboardCommand(context: PipelineContext): Promise<PipelineResult> {
  const { startTime, message } = context;
  const dashboardLink = await getDashboardLink(message);

  if (!dashboardLink) {
    return {
      response: {
        text: getTemplate('dashboardLinkError', 'de'),
        metadata: { language: 'de', shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  return {
    response: {
      text: getTemplate('dashboardLinkInstruction', 'de'),
      urlButton: { title: 'Dashboard öffnen', url: dashboardLink },
      metadata: { language: 'de', shouldLog: true },
    },
    eventsCreated: 0,
    success: true,
    latencyMs: Date.now() - startTime,
  };
}

async function getDashboardLink(message: StandardMessage): Promise<string | null> {
  const channel = message.channel as MessagingChannel;
  const primary = await generateDashboardLinkForUser(message.userId, channel);
  if (primary.success && primary.link) {
    return primary.link;
  }

  if (message.metadata.senderId) {
    const fallback = await generateDashboardLink(message.metadata.senderId, channel);
    if (fallback.success && fallback.link) {
      return fallback.link;
    }
  }

  return null;
}

async function processWithBrain(context: PipelineContext): Promise<PipelineResult> {
  const { message, startTime, conversationState } = context;
  const lang = message.content ? detectLanguage(message.content) : 'de';

  const history = await getMessageHistory(message.userId, 10);
  const dedupedHistory = history.filter(msg =>
    !(msg.role === 'user' && msg.whatsapp_message_id === message.id)
  );

  const chatHistory: ChatMessage[] = dedupedHistory.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  // For media messages (image, voice, document), download first then process
  if ((message.type === 'image' || message.type === 'voice' || message.type === 'document') && message.mediaRef) {
    const adapter = getAdapter(message.channel);
    let attachment: { buffer: Buffer; mimeType: string; filename?: string } | undefined;
    
    if (adapter?.downloadMedia) {
      try {
        const buffer = await adapter.downloadMedia(message.mediaRef);
        console.log(`[Pipeline] Downloaded ${message.type} via ${message.channel}: ${buffer.length} bytes`);
        attachment = {
          buffer,
          mimeType: message.mediaRef.mimeType,
          filename: message.mediaRef.filename,
        };
      } catch (error) {
        console.error(`[Pipeline] Failed to download ${message.type}:`, error);
      }
    }
    
    const brainResult = await processBrain({
      type: message.type,
      attachment,
      userId: message.userId,
      householdId: message.householdId || '',
      familyMembers: message.familyMembers,
      conversationHistory: chatHistory,
      phoneNumber: message.metadata.senderId,
      messageId: message.id,
    });

    return handleBrainResult(brainResult, context, lang);
  }

  const extractionInput = conversationState.state === 'clarifying' && conversationState.clarificationContext
    ? `Vorherige Rückfrage: ${conversationState.clarificationContext}\nNutzerantwort: ${message.content || ''}`
    : message.content || '';

  const extractionResult = await parseEventWithFallback(
    extractionInput,
    chatHistory,
    message.familyMembers
  );

  const msgType = message.type as string;
  const loggableMessageType: 'text' | 'image' | 'voice' =
    msgType === 'voice' ? 'voice' :
    msgType === 'image' ? 'image' : 'text';

  logAIInteraction(
    {
      userId: message.userId,
      channel: message.channel,
      userMessage: message.content || '',
      messageType: loggableMessageType,
      contextMessageCount: history.length,
      familyMembers: message.familyMembers,
    },
    {
      promptVersion: extractionResult._meta?.promptVersion || 'event-v1.0',
      model: extractionResult._meta?.model || 'unknown',
      aiOutput: extractionResult,
      intentDetected: extractionResult.events.length > 0 ? 'create_event' : 'chat',
      eventsExtracted: extractionResult.events.length,
      actionTaken: extractionResult.events.length > 0 ? 'event_created' : 'response_sent',
      wasSuccessful: true,
      latencyMs: extractionResult._meta?.latencyMs || 0,
    }
  ).catch(err => console.error('[Pipeline] AI logging failed:', err));

  if (extractionResult.needs_clarification && extractionResult.clarification_question) {
    await setClarifyingState(
      message.userId,
      message.channel,
      extractionResult.clarification_question
    );

    return {
      response: {
        text: extractionResult.clarification_question,
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  if (message.householdId && extractionResult.events.length > 0) {
    if (conversationState.state === 'clarifying') {
      await clearConversationState(message.userId, message.channel);
    }

    const confidence = extractionResult.confidence ?? 0.75;

    if (confidence >= AI_DECISION_THRESHOLDS.save) {
      return handleHighConfidenceEvents(extractionResult.events, context, lang);
    }

    if (confidence >= AI_DECISION_THRESHOLDS.draft) {
      return handleMediumConfidenceEvents(extractionResult.events, context, lang, confidence);
    }

    return {
      response: {
        text: extractionResult.clarification_question ||
          (lang === 'de' 
            ? 'Ich bin mir nicht sicher, ob ich das richtig verstanden habe. Könntest du mir mehr Details geben?'
            : "I'm not sure I understood correctly. Could you provide more details?"),
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  if (conversationState.state === 'clarifying' && !extractionResult.needs_clarification) {
    await clearConversationState(message.userId, message.channel);
  }

  const aiResponse = await generateResponseWithFallback(chatHistory, message.content || '');

  return {
    response: {
      text: aiResponse,
      metadata: { language: lang, shouldLog: true },
    },
    eventsCreated: 0,
    success: true,
    latencyMs: Date.now() - startTime,
  };
}

async function handleBrainResult(
  brainResult: BrainResult,
  context: PipelineContext,
  lang: 'de' | 'en'
): Promise<PipelineResult> {
  const { startTime, message } = context;

  if (brainResult.error) {
    return {
      response: {
        text: lang === 'de'
          ? 'Entschuldigung, ich konnte die Datei nicht verarbeiten.'
          : 'Sorry, I could not process the file.',
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      error: brainResult.error,
      latencyMs: Date.now() - startTime,
    };
  }

  if (brainResult.action === 'ask' && brainResult.clarificationQuestion) {
    await setClarifyingState(
      message.userId,
      message.channel,
      brainResult.clarificationQuestion
    );

    return {
      response: {
        text: brainResult.clarificationQuestion,
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  if (brainResult.action === 'save' && brainResult.events.length > 0) {
    return handleHighConfidenceEvents(brainResult.events, context, lang);
  }

  if (brainResult.action === 'draft' && brainResult.events.length > 0) {
    return handleMediumConfidenceEvents(
      brainResult.events,
      context,
      lang,
      brainResult.confidence
    );
  }

  return {
    response: {
      text: lang === 'de'
        ? 'Ich konnte keinen Termin erkennen. Bitte nenne Datum und Uhrzeit möglichst konkret.'
        : 'I could not identify an event. Please include a clear date and time.',
      metadata: { language: lang, shouldLog: true },
    },
    eventsCreated: 0,
    success: true,
    latencyMs: Date.now() - startTime,
  };
}

async function handleHighConfidenceEvents(
  events: Array<{ title: string; event_date: string; event_time?: string; is_all_day: boolean; family_member?: string; location?: string; description?: string }>,
  context: PipelineContext,
  lang: 'de' | 'en'
): Promise<PipelineResult> {
  const { message, startTime } = context;

  if (!message.householdId) {
    return {
      response: {
        text: getTemplate('notInHousehold', lang),
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const successfulEvents = events.length === 1
    ? (await Promise.all([
        createEvent(message.householdId!, message.userId, {
          ...events[0],
          source_message_id: message.id,
        }),
      ])).filter(e => e !== null)
    : await createEventsBulk(
        message.householdId,
        message.userId,
        events.map(eventData => ({
          ...eventData,
          source_message_id: message.id,
        }))
      );

  if (successfulEvents.length > 0) {
    await setUndoState(message.userId, message.channel, successfulEvents[0]!.id);

    // Create 30-minute reminders for events with specific times
    for (const event of successfulEvents) {
      await createDefaultReminder(event, message.userId);
    }

    let confirmationText: string;

    if (successfulEvents.length === 1) {
      const event = successfulEvents[0]!;
      const formattedDate = formatDateForLanguage(new Date(event.event_date), lang);
      const timeStr = event.event_time
        ? (lang === 'de' ? ` um ${event.event_time}` : ` at ${event.event_time}`)
        : (lang === 'de' ? ' (ganztagig)' : ' (all day)');
      const memberStr = event.family_member
        ? (lang === 'de' ? ` für ${event.family_member}` : ` for ${event.family_member}`)
        : '';
      const reminderStr = event.event_time && !event.is_all_day
        ? (lang === 'de' ? '\n\n⏰ Ich erinnere dich 30 Minuten vorher.' : "\n\n⏰ I'll remind you 30 minutes before.")
        : '';

      confirmationText = lang === 'de'
        ? `Termin gespeichert:\n\n"${event.title}"${memberStr}\n${formattedDate}${timeStr}${reminderStr}`
        : `Event saved:\n\n"${event.title}"${memberStr}\n${formattedDate}${timeStr}${reminderStr}`;
    } else {
      confirmationText = lang === 'de'
        ? `${successfulEvents.length} Termine gespeichert!`
        : `${successfulEvents.length} events saved!`;
    }

    const dashboardLink = await getDashboardLink(message);
    return {
      response: {
        text: confirmationText,
        buttons: [{ id: 'undo', title: lang === 'de' ? 'Rückgängig' : 'Undo' }],
        urlButton: dashboardLink ? { title: 'Dashboard', url: dashboardLink } : undefined,
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: successfulEvents.length,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  return {
    response: {
      text: getTemplate('saveError', lang),
      metadata: { language: lang, shouldLog: true },
    },
    eventsCreated: 0,
    success: false,
    latencyMs: Date.now() - startTime,
  };
}

async function handleMediumConfidenceEvents(
  events: Array<{ title: string; event_date: string; event_time?: string; is_all_day: boolean; family_member?: string; location?: string; description?: string }>,
  context: PipelineContext,
  lang: 'de' | 'en',
  confidence: number
): Promise<PipelineResult> {
  const { message, startTime } = context;

  if (!message.householdId) {
    return {
      response: {
        text: getTemplate('notInHousehold', lang),
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  const firstEvent = events[0];
  const draft = await createDraftEvent(message.householdId, message.userId, {
    ...firstEvent,
    is_all_day: firstEvent.is_all_day ?? !firstEvent.event_time,
    reason: 'low_confidence',
    confidence,
  });

  if (draft) {
    await setDraftPendingState(message.userId, message.channel, draft.id);

    const formattedDate = formatDateForLanguage(new Date(firstEvent.event_date), lang);
    const timeStr = firstEvent.event_time || (lang === 'de' ? 'ganztagig' : 'all day');

    const confirmText = lang === 'de'
      ? `${getTemplate('draftHeader', 'de')}\n\n"${firstEvent.title}"\n${formattedDate}, ${timeStr}\n\n${getTemplate('isThisCorrect', 'de')}`
      : `${getTemplate('draftHeader', 'en')}\n\n"${firstEvent.title}"\n${formattedDate}, ${timeStr}\n\n${getTemplate('isThisCorrect', 'en')}`;

    return {
      response: {
        text: confirmText,
        // SMART_AI_V2: Split buttons - 'modify' for edit, 'reject' only for explicit discard
        buttons: [
          { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
          { id: 'modify', title: lang === 'de' ? 'Ändern' : 'Edit' },
        ],
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  return {
    response: {
      text: getTemplate('saveDraftError', lang),
      metadata: { language: lang, shouldLog: true },
    },
    eventsCreated: 0,
    success: false,
    latencyMs: Date.now() - startTime,
  };
}

// Legacy export for backward compatibility
export const pipeline = {
  process: processMessage,
};
