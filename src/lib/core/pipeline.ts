/**
 * Processing Pipeline - Phase 1.3
 *
 * Orchestrates message processing through discrete steps:
 * 1. Context Building - Gather all context needed for processing
 * 2. Command Detection - Check for special commands
 * 3. Intent Routing - Route to appropriate handler based on intent
 * 4. Action Handling - Execute the determined action
 * 5. Response Building - Format the response
 */

import type {
  PipelineContext,
  PipelineResult,
  StandardMessage,
} from './types';
import {
  clearConversationState,
  setUndoState,
  setDraftPendingState,
  setClarifyingState,
} from './state';
import { parseEventWithFallback, generateResponseWithFallback } from '@/lib/ai';
import { processInput as processBrain } from '@/lib/ai/brain';
import {
  createEvent,
  createDraftEvent,
  confirmDraftEvent,
  rejectDraftEvent,
  deleteEvent,
  getMessageHistory,
  generateDashboardLink,
} from '@/lib/supabase';
import { detectLanguage, getTemplate, formatDateForLanguage } from '@/lib/ai/response-templates';
import { logAIInteraction } from '@/lib/ai/logging';
import type { ChatMessage } from '@/types';
import type { MessagingChannel } from './types';

const COMMANDS = {
  dashboard: ['dashboard', 'link', 'login'],
  help: ['help', 'hilfe', '?'],
  start: ['start', 'hallo', 'hi', 'hello'],
  confirm: ['ja', 'yes', 'ok', 'correct', 'richtig', 'stimmt', 'passt'],
  reject: ['nein', 'no', 'cancel', 'abbrechen', 'falsch'],
  undo: ['undo', 'rückgängig', 'rückgängig machen', 'zurück'],
};

function matchCommand(text: string): keyof typeof COMMANDS | null {
  const lower = text.toLowerCase().trim();

  for (const [command, patterns] of Object.entries(COMMANDS)) {
    if (patterns.includes(lower)) {
      return command as keyof typeof COMMANDS;
    }
  }

  return null;
}

class ProcessingPipeline {
  async process(context: PipelineContext): Promise<PipelineResult> {
    const { message, conversationState, startTime, requestId } = context;

    try {
      console.log(`[Pipeline:${requestId}] Processing ${message.type} message`);

      if (message.isNewUser) {
        return this.handleNewUser(context);
      }

      if (conversationState.state !== 'idle') {
        const stateResult = await this.handleStatefulFlow(context);
        if (stateResult) {
          return stateResult;
        }
      }

      const command = message.content ? matchCommand(message.content) : null;
      if (command) {
        return this.handleCommand(command, context);
      }

      return this.processWithBrain(context);

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

  private async handleNewUser(context: PipelineContext): Promise<PipelineResult> {
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

  private async handleStatefulFlow(
    context: PipelineContext
  ): Promise<PipelineResult | null> {
    const { message, conversationState } = context;
    const content = message.content?.toLowerCase().trim() || '';

    switch (conversationState.state) {
      case 'draft_pending':
        return this.handleDraftPending(context, content);

      case 'awaiting_undo':
        return this.handleAwaitingUndo(context, content);

      case 'clarifying':
        return null;

      default:
        return null;
    }
  }

  private async handleDraftPending(
    context: PipelineContext,
    content: string
  ): Promise<PipelineResult | null> {
    const { message, conversationState, startTime } = context;

    if (COMMANDS.confirm.some(c => content.includes(c))) {
      if (conversationState.draftEventId && message.householdId) {
        const event = await confirmDraftEvent(
          conversationState.draftEventId,
          message.householdId,
          message.userId
        );

        await clearConversationState(message.userId, message.channel);

        if (event) {
          const lang = detectLanguage(content);
          const dashboardLink = await this.getDashboardLink(message);
          return {
            response: {
              text: lang === 'de' 
                ? `Termin "${event.title}" wurde gespeichert!` 
                : `Event "${event.title}" saved!`,
              urlButton: dashboardLink ? { title: 'Dashboard', url: dashboardLink } : undefined,
              metadata: { language: lang, shouldLog: true },
            },
            eventsCreated: 1,
            success: true,
            latencyMs: Date.now() - startTime,
          };
        }
      }
    }

    if (COMMANDS.reject.some(c => content.includes(c))) {
      if (conversationState.draftEventId && message.householdId) {
        await rejectDraftEvent(conversationState.draftEventId, message.householdId);
        await clearConversationState(message.userId, message.channel);

        return {
          response: {
            text: getTemplate('draftDiscarded', 'de'),
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    await clearConversationState(message.userId, message.channel);
    return null;
  }

  private async handleAwaitingUndo(
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

  private async handleCommand(
    command: keyof typeof COMMANDS,
    context: PipelineContext
  ): Promise<PipelineResult> {
    const { startTime } = context;

    switch (command) {
      case 'dashboard':
        return this.handleDashboardCommand(context);

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

      case 'confirm':
      case 'reject':
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

  private async handleDashboardCommand(context: PipelineContext): Promise<PipelineResult> {
    const { startTime, message } = context;
    const dashboardLink = await this.getDashboardLink(message);

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

  private async getDashboardLink(message: StandardMessage): Promise<string | null> {
    if (!message.metadata.senderId) {
      return null;
    }

    const channel = message.channel as MessagingChannel;
    const result = await generateDashboardLink(message.metadata.senderId, channel);
    if (!result.success || !result.link) {
      return null;
    }

    return result.link;
  }

  private async processWithBrain(context: PipelineContext): Promise<PipelineResult> {
    const { message, startTime } = context;
    const lang = message.content ? detectLanguage(message.content) : 'de';

    const history = await getMessageHistory(message.userId, 10);
    const chatHistory: ChatMessage[] = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    if (message.type === 'image' || message.type === 'voice') {
      const brainResult = await processBrain({
        type: message.type,
        mediaId: message.mediaRef?.id,
        mimeType: message.mediaRef?.mimeType,
        userId: message.userId,
        householdId: message.householdId || '',
        familyMembers: message.familyMembers,
        phoneNumber: message.metadata.senderId,
        messageId: message.id,
      });

      return this.handleBrainResult(brainResult, context, lang);
    }

    const extractionResult = await parseEventWithFallback(
      message.content || '',
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
      const confidence = extractionResult.confidence ?? 0.75;

      if (confidence >= 0.85) {
        return this.handleHighConfidenceEvents(extractionResult.events, context, lang);
      }

      if (confidence >= 0.50) {
        return this.handleMediumConfidenceEvents(extractionResult.events, context, lang, confidence);
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

  private async handleBrainResult(
    brainResult: { action: string; events: unknown[]; confidence: number; clarificationQuestion?: string; error?: string },
    context: PipelineContext,
    lang: 'de' | 'en'
  ): Promise<PipelineResult> {
    const { startTime } = context;

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

    return {
      response: {
        text: lang === 'de'
          ? 'Ich habe die Datei verarbeitet.'
          : 'I have processed the file.',
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  private async handleHighConfidenceEvents(
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

    const createdEvents = await Promise.all(
      events.map(eventData =>
        createEvent(message.householdId!, message.userId, {
          ...eventData,
          source_message_id: message.id,
        })
      )
    );

    const successfulEvents = createdEvents.filter(e => e !== null);

    if (successfulEvents.length > 0) {
      await setUndoState(message.userId, message.channel, successfulEvents[0]!.id);

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

        confirmationText = lang === 'de'
          ? `Termin gespeichert:\n\n"${event.title}"${memberStr}\n${formattedDate}${timeStr}`
          : `Event saved:\n\n"${event.title}"${memberStr}\n${formattedDate}${timeStr}`;
      } else {
        confirmationText = lang === 'de'
          ? `${successfulEvents.length} Termine gespeichert!`
          : `${successfulEvents.length} events saved!`;
      }

      const dashboardLink = await this.getDashboardLink(message);
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

  private async handleMediumConfidenceEvents(
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
          buttons: [
            { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
            { id: 'reject', title: lang === 'de' ? 'Nein, Änderungen' : 'No, changes' },
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
}

export const pipeline = new ProcessingPipeline();
