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
  getUndoableEventIds,
} from './state';
import { parseEventWithFallback, generateResponseWithFallback } from '@/lib/ai';
import { processInput as processBrain } from '@/lib/ai/brain';
import { AI_DECISION_THRESHOLDS } from '@/lib/ai/constants';
import {
  getAdminClient,
  createEvent,
  createEventsBulk,
  confirmDraftEvent,
  rejectDraftEvent,
  getDraftEvent,
  deleteEvent,
  getMessageHistory,
  generateDashboardLinkForUser,
  generateDashboardLink,
  createEventReminder,
  createDraftBundle,
  getDraftBundle,
  getLatestPendingDraftBundle,
  getLatestPendingDraftEvent,
  confirmDraftBundle,
  rejectDraftBundle,
  applyDraftBundleModifications,
  applyDraftEventModifications,
} from '@/lib/supabase';
import { detectLanguage, getTemplate, formatTemplate, formatDateForLanguage } from '@/lib/ai/response-templates';
import { logAIInteraction } from '@/lib/ai/logging';
import type { ChatMessage } from '@/types';
import type { MessagingChannel, Channel } from './types';
import type { BrainResult } from '@/lib/ai/types';
import { resolveConfirmationIntent } from '@/lib/ai/confirmation-resolver';
import { isAmbiguousFamilyMemberName } from '@/lib/utils/family-members';
import { log, logError } from '@/lib/utils/logger';
import { recurrenceToRRule } from '@/lib/recurrence';
import type { ParsedEvent } from '@/lib/ai/types';

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
    if (reminderTime <= new Date()) {
      return;
    }

    const admin = getAdminClient();

    // Guard against duplicate pending reminders for the same event/user/time.
    // The unique partial index idx_reminders_event_user_remind_at_unique handles
    // the race, but checking first avoids noisy conflict errors and unnecessary writes.
    const { data: existingReminder } = await admin
      .from('reminders')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', userId)
      .eq('remind_at', reminderTime.toISOString())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingReminder) {
      log.info(`[Reminder] Default 30-min reminder already exists for event "${event.title}"`);
      return;
    }

    await createEventReminder(
      userId,
      event.id,
      event.title,
      reminderTime,
      `⏰ Erinnerung: "${event.title}" in 30 Minuten`
    );
    log.info(`[Reminder] Created 30-min reminder for event "${event.title}"`);
  } catch (error) {
    logError('[Reminder] Failed to create default reminder:', error);
    // Non-critical error - don't block event creation
  }
}

/**
 * Convert a ParsedEvent into the payload shape expected by createEvent/createEventsBulk,
 * including recurrence object → RRULE string conversion.
 */
function toEventInput(event: ParsedEvent): {
  title: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
  recurrence_rule?: string;
} {
  const input: ReturnType<typeof toEventInput> = {
    title: event.title,
    event_date: event.event_date,
    event_time: event.event_time,
    end_time: event.end_time,
    is_all_day: event.is_all_day,
    family_member: event.family_member,
    location: event.location,
    description: event.description,
  };

  if (event.recurrence?.is_recurring) {
    try {
      input.recurrence_rule = recurrenceToRRule({
        frequency: event.recurrence.frequency,
        interval: event.recurrence.interval ?? 1,
        byDay: event.recurrence.by_day as import('@/lib/recurrence').Weekday[],
      });
    } catch (error) {
      logError('[Pipeline] Failed to convert recurrence to RRULE:', error);
    }
  } else if (event.recurrence_rule) {
    input.recurrence_rule = event.recurrence_rule;
  }

  return input;
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
    log.info(`[Pipeline:${requestId}] Processing ${message.type} message`);

    if (message.isNewUser) {
      return handleNewUser(context);
    }

    if (conversationState.state !== 'idle') {
      const stateResult = await handleStatefulFlow(context);
      if (stateResult) {
        return stateResult;
      }
    }

    // Recovery path: if state was lost but user sends short confirmation text,
    // try to restore latest pending draft for this user.
    if (
      conversationState.state === 'idle' &&
      message.content &&
      message.householdId &&
      isLikelyDraftReply(message.content)
    ) {
      const recovered = await recoverDraftState(context);
      if (recovered) {
        return recovered;
      }
    }

    const command = message.content ? matchCommand(message.content) : null;
    if (command) {
      return handleCommand(command, context);
    }

    return processWithBrain(context);

  } catch (error) {
    logError(`[Pipeline:${requestId}] Error:`, error);

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
    case 'awaiting_confirmation': // legacy compatibility
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

  const draftBundleId = conversationState.draftBundleId;
  const legacyDraftId = conversationState.draftEventId;

  if (!message.householdId) {
    await clearConversationState(message.userId, message.channel);
    return {
      response: {
        text: getTemplate('draftNotMatched', lang),
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  // Need draft reference to proceed
  if (!draftBundleId && !legacyDraftId) {
    const recovered = await recoverDraftReference(message.userId, message.channel, message.householdId);
    if (recovered) {
      if (recovered.type === 'bundle') {
        return handleDraftPending(
          {
            ...context,
            conversationState: {
              ...conversationState,
              state: 'draft_pending',
              draftBundleId: recovered.id,
            },
          },
          content
        );
      }

      return handleDraftPending(
        {
          ...context,
          conversationState: {
            ...conversationState,
            state: 'draft_pending',
            draftEventId: recovered.id,
          },
        },
        content
      );
    }

    await clearConversationState(message.userId, message.channel);
    return {
      response: {
        text: getTemplate('draftNotFound', lang),
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }

  let draft: Awaited<ReturnType<typeof getDraftEvent>> | null = null;
  let bundleEvents: Array<{
    id: string;
    title: string;
    event_date: string;
    event_time?: string | null;
    end_time?: string | null;
    is_all_day: boolean;
    family_member?: string | null;
    location?: string | null;
    description?: string | null;
  }> = [];

  if (draftBundleId) {
    const bundle = await getDraftBundle(draftBundleId, message.householdId);
    if (bundle) {
      bundleEvents = bundle.events;
      draft = bundle.events[0]
        ? {
            ...bundle.events[0],
            reason: bundle.events[0].reason,
            confidence: bundle.events[0].confidence,
          }
        : null;
    }
  } else if (legacyDraftId) {
    draft = await getDraftEvent(legacyDraftId, message.householdId);
    if (draft) {
      bundleEvents = [draft];
    }
  }

  if (!draft || bundleEvents.length === 0) {
    await clearConversationState(message.userId, message.channel);
    return {
      response: {
        text: getTemplate('draftExpired', lang),
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
    chatHistory,
    message.householdId
  );

  log.info(`[Pipeline] Draft confirmation intent: ${intentResult.intent}`);

  switch (intentResult.intent) {
    case 'confirm': {
      const events = draftBundleId
        ? await confirmDraftBundle(
            draftBundleId,
            message.householdId,
            message.userId
          )
        : await confirmDraftEvent(
            legacyDraftId!,
            message.householdId,
            message.userId
          ).then((event) => (event ? [event] : null));

      await clearConversationState(message.userId, message.channel);

      if (events && events.length > 0) {
        for (const event of events) {
          await createDefaultReminder(event, message.userId);
        }

        const dashboardLink = await getDashboardLink(message);
        const confirmationText = events.length === 1
          ? (lang === 'de'
              ? `Termin "${events[0]!.title}" wurde gespeichert!\n\n⏰ Ich erinnere dich 30 Minuten vorher.`
              : formatTemplate('eventSavedWithReminder', lang, { title: events[0]!.title }))
          : formatTemplate('eventsSavedWithReminders', lang, { count: events.length });

        return {
          response: {
            text: confirmationText,
            urlButton: dashboardLink ? { title: getTemplate('openDashboard', lang), url: dashboardLink } : undefined,
            metadata: { language: lang, shouldLog: true },
          },
          eventsCreated: events.length,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        response: {
          text: getTemplate('saveEventError', lang),
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: false,
        latencyMs: Date.now() - startTime,
      };
    }

    case 'reject': {
      if (draftBundleId) {
        await rejectDraftBundle(draftBundleId, message.householdId);
      } else {
        await rejectDraftEvent(legacyDraftId!, message.householdId);
      }
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
      const modifications = intentResult.modifications ?? [];

      if (modifications.length === 0) {
        return {
          response: {
            text: lang === 'de'
              ? 'Welche Änderung soll ich übernehmen?'
              : 'What change should I apply?',
            metadata: { language: lang, shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }

      if (draftBundleId) {
        const updated = await applyDraftBundleModifications(
          draftBundleId,
          message.householdId,
          modifications,
          content
        );

        if (!updated) {
          return {
            response: {
              text: lang === 'de'
                ? 'Ich konnte die Änderung leider nicht übernehmen. Bitte versuche es genauer.'
                : 'I could not apply that change. Please be more specific.',
              metadata: { language: lang, shouldLog: true },
            },
            eventsCreated: 0,
            success: true,
            latencyMs: Date.now() - startTime,
          };
        }

        if (updated.ambiguousTarget) {
          return {
            response: {
              text: lang === 'de'
                ? getTemplate('multipleDraftsNeedDay', lang)
                : getTemplate('multipleDraftsNeedDay', lang),
              metadata: { language: lang, shouldLog: true },
            },
            eventsCreated: 0,
            success: true,
            latencyMs: Date.now() - startTime,
          };
        }

        const confirmText = buildDraftBundlePreviewText(updated.events, lang);

        return {
          response: {
            text: confirmText,
            buttons: [
              { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
              { id: 'modify', title: lang === 'de' ? 'Weiter ändern' : 'Edit more' },
              { id: 'discard', title: lang === 'de' ? 'Verwerfen' : 'Discard' },
            ],
            metadata: { language: lang, shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }

      const updatedDraft = await applyDraftEventModifications(
        legacyDraftId!,
        message.householdId,
        modifications
      );

      if (!updatedDraft) {
        return {
          response: {
            text: lang === 'de'
              ? 'Ich konnte die Änderung nicht übernehmen. Sag mir bitte genau, was ich anpassen soll.'
              : 'I could not apply that change. Please tell me exactly what to update.',
            metadata: { language: lang, shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }

      const formattedDate = formatDateForLanguage(new Date(updatedDraft.event_date), lang);
      const timeStr = updatedDraft.event_time || (lang === 'de' ? 'ganztagig' : 'all day');

      return {
        response: {
          text: lang === 'de'
            ? `${getTemplate('draftHeader', 'de')}\n\n"${updatedDraft.title}"\n${formattedDate}, ${timeStr}\n\n${getTemplate('isThisCorrect', 'de')}`
            : `${getTemplate('draftHeader', 'en')}\n\n"${updatedDraft.title}"\n${formattedDate}, ${timeStr}\n\n${getTemplate('isThisCorrect', 'en')}`,
          buttons: [
            { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
            { id: 'modify', title: lang === 'de' ? 'Weiter ändern' : 'Edit more' },
            { id: 'discard', title: lang === 'de' ? 'Verwerfen' : 'Discard' },
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
            { id: 'discard', title: lang === 'de' ? 'Nein, verwerfen' : 'No, discard' },
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
  const { message, startTime } = context;

  if (COMMANDS.undo.some(c => content.includes(c))) {
    if (message.householdId) {
      const undoableEventIds = await getUndoableEventIds(message.userId, message.channel);

      if (undoableEventIds.length > 0) {
        const deletedCount = await Promise.all(
          undoableEventIds.map((eventId) =>
            deleteEvent(eventId, message.householdId!, message.userId)
          )
        ).then((results) => results.filter(Boolean).length);

        await clearConversationState(message.userId, message.channel);

        if (deletedCount > 0) {
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
      urlButton: { title: getTemplate('openDashboard', 'de'), url: dashboardLink },
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
        log.info(`[Pipeline] Downloaded ${message.type} via ${message.channel}: ${buffer.length} bytes`);
        attachment = {
          buffer,
          mimeType: message.mediaRef.mimeType,
          filename: message.mediaRef.filename,
        };
      } catch (error) {
        logError(`[Pipeline] Failed to download ${message.type}:`, error);
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
    message.familyMembers,
    message.householdId
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
  ).catch(err => logError('[Pipeline] AI logging failed:', err));

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
    const hasAmbiguousMemberAssignments = extractionResult.events.some((event) =>
      isAmbiguousFamilyMemberName(event.family_member)
    );

    // Guardrail: avoid auto-save when one extracted event contains multiple names
    // (e.g., "Anna und Ben") which would create confusing badges/assignments.
    if (hasAmbiguousMemberAssignments) {
      return handleMediumConfidenceEvents(
        extractionResult.events,
        context,
        lang,
        Math.max(confidence, AI_DECISION_THRESHOLDS.draft)
      );
    }

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

  const aiResponse = await generateResponseWithFallback(chatHistory, message.content || '', message.householdId);

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
        text: getTemplate('fileProcessingError', lang),
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

  if (brainResult.action === 'already_saved' && brainResult.events.length > 0) {
    const eventCount = brainResult.events.length;
    const confirmationText = eventCount === 1
      ? formatTemplate('visionEventSaved', lang, { title: brainResult.events[0]!.title })
      : formatTemplate('visionEventsSaved', lang, { count: eventCount });

    return {
      response: {
        text: confirmationText,
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: eventCount,
      success: true,
      latencyMs: Date.now() - startTime,
    };
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
  events: ParsedEvent[],
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
          ...toEventInput(events[0]),
          source_message_id: message.id,
        }),
      ])).filter(e => e !== null)
    : await createEventsBulk(
        message.householdId,
        message.userId,
        events.map(eventData => ({
          ...toEventInput(eventData),
          source_message_id: message.id,
        }))
      );

  if (successfulEvents.length > 0) {
    await setUndoState(
      message.userId,
      message.channel,
      successfulEvents.map((e) => e.id)
    );

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

      confirmationText = formatTemplate('eventSavedDetails', lang, {
        title: event.title,
        memberStr,
        formattedDate,
        timeStr,
        reminderStr,
      });
    } else {
      confirmationText = formatTemplate('eventsSavedCount', lang, { count: successfulEvents.length });
    }

    const dashboardLink = await getDashboardLink(message);
    return {
      response: {
        text: confirmationText,
        buttons: [{ id: 'undo', title: lang === 'de' ? 'Rückgängig' : 'Undo' }],
        urlButton: dashboardLink ? { title: getTemplate('openDashboard', lang), url: dashboardLink } : undefined,
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

function buildDraftBundlePreviewText(
  events: Array<{
    title: string;
    event_date: string;
    event_time?: string | null;
  }>,
  lang: 'de' | 'en'
): string {
  const previewLines = events.slice(0, 3).map((event) => {
    const formattedDate = formatDateForLanguage(new Date(event.event_date), lang);
    const timeStr = event.event_time || (lang === 'de' ? 'ganztagig' : 'all day');
    return `- ${event.title}: ${formattedDate}, ${timeStr}`;
  });

  const remaining = events.length - previewLines.length;
  const remainingLine = remaining > 0
    ? (lang === 'de' ? `\n- ... und ${remaining} weitere` : `\n- ... and ${remaining} more`)
    : '';

  return lang === 'de'
    ? `${getTemplate('draftHeader', 'de')}\n\nIch habe ${events.length} Termine erkannt:\n${previewLines.join('\n')}${remainingLine}\n\n${getTemplate('isThisCorrect', 'de')}`
    : `${getTemplate('draftHeader', 'en')}\n\nI found ${events.length} events:\n${previewLines.join('\n')}${remainingLine}\n\n${getTemplate('isThisCorrect', 'en')}`;
}

async function handleMediumConfidenceEvents(
  events: ParsedEvent[],
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

  const draftBundle = await createDraftBundle(
    message.householdId,
    message.userId,
    events.map((event) => ({
      ...event,
      is_all_day: event.is_all_day ?? !event.event_time,
      reason: 'low_confidence',
      confidence,
    }))
  );

  if (draftBundle) {
    await setDraftPendingState(message.userId, message.channel, draftBundle.bundleId, { isBundle: true });

    const confirmText = buildDraftBundlePreviewText(events, lang);

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

function isLikelyDraftReply(content: string): boolean {
  const lower = content.toLowerCase().trim();
  if (lower.length === 0 || lower.length > 40) {
    return false;
  }

  const signals = [
    'ja', 'yes', 'ok', 'okay', 'sure', 'passt',
    'no', 'nein', 'nope', 'cancel', 'abbrechen',
    'confirm', 'reject', 'discard', 'modify', 'edit', 'ändern',
  ];

  return signals.some((signal) => lower === signal || lower.includes(signal));
}

async function recoverDraftReference(
  userId: string,
  channel: MessagingChannel | Channel,
  householdId: string
): Promise<{ type: 'bundle' | 'event'; id: string } | null> {
  const pendingBundle = await getLatestPendingDraftBundle(householdId, userId);
  if (pendingBundle) {
    await setDraftPendingState(userId, channel, pendingBundle.bundleId, { isBundle: true });
    return { type: 'bundle', id: pendingBundle.bundleId };
  }

  const pendingDraft = await getLatestPendingDraftEvent(householdId, userId);
  if (pendingDraft) {
    await setDraftPendingState(userId, channel, pendingDraft.draftId);
    return { type: 'event', id: pendingDraft.draftId };
  }

  return null;
}

async function recoverDraftState(context: PipelineContext): Promise<PipelineResult | null> {
  const { message, conversationState } = context;
  if (!message.householdId) {
    return null;
  }

  const recovered = await recoverDraftReference(message.userId, message.channel, message.householdId);
  if (!recovered) {
    return null;
  }

  return handleDraftPending(
    {
      ...context,
      conversationState: {
        ...conversationState,
        state: 'draft_pending',
        draftBundleId: recovered.type === 'bundle' ? recovered.id : undefined,
        draftEventId: recovered.type === 'event' ? recovered.id : undefined,
      },
    },
    message.content?.toLowerCase().trim() || ''
  );
}

// Legacy export for backward compatibility
export const pipeline = {
  process: processMessage,
};
