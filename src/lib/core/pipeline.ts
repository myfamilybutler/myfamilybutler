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
  StandardResponse,
  StandardMessage,
  ConversationState,
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
} from '@/lib/supabase';
import { getPersona, buildPersonaPrompt } from '@/lib/persona';
import { detectLanguage, getTemplate, formatDateForLanguage } from '@/lib/ai/response-templates';
import { logAIInteraction } from '@/lib/ai/logging';
import type { ChatMessage } from '@/types';

// ===========================================
// Command Patterns
// ===========================================

const COMMANDS = {
  dashboard: ['dashboard', 'link', 'login'],
  help: ['help', 'hilfe', '?'],
  start: ['start', 'hallo', 'hi', 'hello'],
  confirm: ['ja', 'yes', 'ok', 'correct', 'richtig', 'stimmt', 'passt'],
  reject: ['nein', 'no', 'cancel', 'abbrechen', 'falsch'],
  undo: ['undo', 'ruckgangig', 'ruckgangig machen', 'zuruck'],
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

// ===========================================
// Pipeline Class
// ===========================================

class ProcessingPipeline {
  /**
   * Process a message through the pipeline
   */
  async process(context: PipelineContext): Promise<PipelineResult> {
    const { message, conversationState, startTime, requestId } = context;
    
    try {
      console.log(`[Pipeline:${requestId}] Processing ${message.type} message`);
      
      // Step 1: Handle new user welcome
      if (message.isNewUser) {
        return this.handleNewUser(context);
      }
      
      // Step 2: Handle state-based flows (draft confirm, undo, clarification)
      if (conversationState.state !== 'idle') {
        const stateResult = await this.handleStatefulFlow(context);
        if (stateResult) {
          return stateResult;
        }
      }
      
      // Step 3: Check for commands
      const command = message.content ? matchCommand(message.content) : null;
      if (command) {
        return this.handleCommand(command, context);
      }
      
      // Step 4: Process through Brain (AI)
      return this.processWithBrain(context);
      
    } catch (error) {
      console.error(`[Pipeline:${requestId}] Error:`, error);
      
      return {
        response: {
          text: 'Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
          metadata: { language: 'de', shouldLog: true },
        },
        eventsCreated: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Handle new user welcome message
   */
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
  
  /**
   * Handle stateful conversation flows
   */
  private async handleStatefulFlow(
    context: PipelineContext
  ): Promise<PipelineResult | null> {
    const { message, conversationState, startTime } = context;
    const content = message.content?.toLowerCase().trim() || '';
    
    switch (conversationState.state) {
      case 'draft_pending':
        return this.handleDraftPending(context, content);
        
      case 'awaiting_undo':
        return this.handleAwaitingUndo(context, content);
        
      case 'clarifying':
        // Re-process with clarification context
        return null; // Fall through to normal processing
        
      default:
        return null;
    }
  }
  
  /**
   * Handle draft pending confirmation
   */
  private async handleDraftPending(
    context: PipelineContext,
    content: string
  ): Promise<PipelineResult | null> {
    const { message, conversationState, startTime } = context;
    
    // Check for confirm
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
          return {
            response: {
              text: `Termin "${event.title}" wurde gespeichert!`,
              urlButton: { title: 'Dashboard', url: '/dashboard' },
              metadata: { language: lang, shouldLog: true },
            },
            eventsCreated: 1,
            success: true,
            latencyMs: Date.now() - startTime,
          };
        }
      }
    }
    
    // Check for reject
    if (COMMANDS.reject.some(c => content.includes(c))) {
      if (conversationState.draftEventId && message.householdId) {
        await rejectDraftEvent(conversationState.draftEventId, message.householdId);
        await clearConversationState(message.userId, message.channel);
        
        return {
          response: {
            text: 'Alles klar, Termin wurde verworfen. Was mochtest du stattdessen eintragen?',
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
      }
    }
    
    // Not a confirm/reject - treat as new message, discard draft
    await clearConversationState(message.userId, message.channel);
    return null; // Fall through to normal processing
  }
  
  /**
   * Handle undo window
   */
  private async handleAwaitingUndo(
    context: PipelineContext,
    content: string
  ): Promise<PipelineResult | null> {
    const { message, conversationState, startTime } = context;
    
    // Check for undo command
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
              text: 'Termin wurde ruckgangig gemacht.',
              metadata: { language: 'de', shouldLog: true },
            },
            eventsCreated: 0,
            success: true,
            latencyMs: Date.now() - startTime,
          };
        }
      }
    }
    
    // Undo window expired or not an undo command
    await clearConversationState(message.userId, message.channel);
    return null; // Fall through to normal processing
  }
  
  /**
   * Handle special commands
   */
  private async handleCommand(
    command: keyof typeof COMMANDS,
    context: PipelineContext
  ): Promise<PipelineResult> {
    const { startTime, message } = context;
    
    switch (command) {
      case 'dashboard':
        return {
          response: {
            text: 'Hier ist dein Dashboard-Link. Der Link ist 15 Minuten gultig.',
            urlButton: { title: 'Dashboard offnen', url: '/dashboard' },
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
        
      case 'help':
        return {
          response: {
            text: `*My Family Butler Hilfe*

*Termine:*
- "Zahnarzt am Montag um 10 Uhr"
- "Meeting morgen 14:00"

*Erinnerungen:*
- "Erinnere mich in 1 Stunde an..."
- "Reminder: Milch kaufen morgen"

*Befehle:*
- dashboard - Dashboard offnen
- help - Diese Hilfe anzeigen`,
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
        
      case 'start':
        return {
          response: {
            text: `Willkommen bei My Family Butler!

Ich bin dein personlicher Familienassistent. Ich kann dir helfen mit:

- Termine erstellen - "Zahnarzt am Montag um 10 Uhr"
- Erinnerungen - "Erinnere mich morgen an Milch kaufen"
- Dashboard offnen - "Dashboard" oder "Link"

Probiere es aus! Schreib mir einfach eine Nachricht.`,
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
        
      case 'confirm':
      case 'reject':
      case 'undo':
        // These should have been handled in stateful flow
        return {
          response: {
            text: 'Es gibt gerade nichts zu bestatigen oder ruckgangig zu machen.',
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
        
      default:
        return {
          response: {
            text: 'Unbekannter Befehl. Tippe "help" fur Hilfe.',
            metadata: { language: 'de', shouldLog: true },
          },
          eventsCreated: 0,
          success: true,
          latencyMs: Date.now() - startTime,
        };
    }
  }
  
  /**
   * Process message through the AI Brain
   */
  private async processWithBrain(context: PipelineContext): Promise<PipelineResult> {
    const { message, startTime, requestId } = context;
    const lang = message.content ? detectLanguage(message.content) : 'de';
    
    // Get message history for context
    const history = await getMessageHistory(message.userId, 10);
    const chatHistory: ChatMessage[] = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    
    // Route based on message type
    if (message.type === 'image' || message.type === 'voice') {
      // Use Brain for media processing
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
    
    // Text message - use event extraction
    const extractionResult = await parseEventWithFallback(
      message.content || '',
      chatHistory,
      message.familyMembers
    );
    
    // Log AI interaction
    // Normalize message type for logging
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
    
    // Handle clarification requests
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
    
    // Process extracted events
    if (message.householdId && extractionResult.events.length > 0) {
      const confidence = extractionResult.confidence ?? 0.75;
      
      // High confidence (>85%) - auto-save with undo
      if (confidence >= 0.85) {
        return this.handleHighConfidenceEvents(extractionResult.events, context, lang);
      }
      
      // Medium confidence (50-85%) - create draft for confirmation
      if (confidence >= 0.50) {
        return this.handleMediumConfidenceEvents(extractionResult.events, context, lang, confidence);
      }
      
      // Low confidence (<50%) - ask for clarification
      return {
        response: {
          text: extractionResult.clarification_question || 
            'Ich bin mir nicht sicher, ob ich das richtig verstanden habe. Konntest du mir mehr Details geben?',
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    }
    
    // No events - generate AI response
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
  
  /**
   * Handle Brain result (for media)
   */
  private async handleBrainResult(
    brainResult: { action: string; events: unknown[]; confidence: number; clarificationQuestion?: string; error?: string },
    context: PipelineContext,
    lang: 'de' | 'en'
  ): Promise<PipelineResult> {
    const { message, startTime } = context;
    
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
    
    // For now, treat media results similar to text
    // The actual event creation would happen here based on brainResult.events
    
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
  
  /**
   * Handle high confidence events (auto-save with undo)
   */
  private async handleHighConfidenceEvents(
    events: Array<{ title: string; event_date: string; event_time?: string; is_all_day: boolean; family_member?: string; location?: string; description?: string }>,
    context: PipelineContext,
    lang: 'de' | 'en'
  ): Promise<PipelineResult> {
    const { message, startTime } = context;
    
    if (!message.householdId) {
      return {
        response: {
          text: lang === 'de'
            ? 'Du bist noch keinem Haushalt zugeordnet. Bitte lass dich einladen.'
            : 'You are not part of a household yet. Please get invited.',
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
      // Set undo state for first event
      await setUndoState(message.userId, message.channel, successfulEvents[0]!.id);
      
      // Build confirmation message
      let confirmationText: string;
      
      if (successfulEvents.length === 1) {
        const event = successfulEvents[0]!;
        const formattedDate = formatDateForLanguage(new Date(event.event_date), lang);
        const timeStr = event.event_time 
          ? (lang === 'de' ? ` um ${event.event_time}` : ` at ${event.event_time}`)
          : (lang === 'de' ? ' (ganztagig)' : ' (all day)');
        const memberStr = event.family_member
          ? (lang === 'de' ? ` fur ${event.family_member}` : ` for ${event.family_member}`)
          : '';
        
        confirmationText = lang === 'de'
          ? `Termin gespeichert:\n\n"${event.title}"${memberStr}\n${formattedDate}${timeStr}`
          : `Event saved:\n\n"${event.title}"${memberStr}\n${formattedDate}${timeStr}`;
      } else {
        confirmationText = lang === 'de'
          ? `${successfulEvents.length} Termine gespeichert!`
          : `${successfulEvents.length} events saved!`;
      }
      
      return {
        response: {
          text: confirmationText,
          buttons: [{ id: 'undo', title: lang === 'de' ? 'Ruckgangig' : 'Undo' }],
          urlButton: { title: 'Dashboard', url: '/dashboard' },
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: successfulEvents.length,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    }
    
    return {
      response: {
        text: lang === 'de'
          ? 'Es gab einen Fehler beim Speichern des Termins.'
          : 'There was an error saving the event.',
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }
  
  /**
   * Handle medium confidence events (draft for confirmation)
   */
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
          text: lang === 'de'
            ? 'Du bist noch keinem Haushalt zugeordnet.'
            : 'You are not part of a household yet.',
          metadata: { language: lang, shouldLog: true },
        },
        eventsCreated: 0,
        success: false,
        latencyMs: Date.now() - startTime,
      };
    }
    
    // Create draft for first event
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
        ? `*Entwurf*\n\n"${firstEvent.title}"\n${formattedDate}, ${timeStr}\n\nStimmt das?`
        : `*Draft*\n\n"${firstEvent.title}"\n${formattedDate}, ${timeStr}\n\nIs this correct?`;
      
      return {
        response: {
          text: confirmText,
          buttons: [
            { id: 'confirm', title: lang === 'de' ? 'Ja, speichern' : 'Yes, save' },
            { id: 'reject', title: lang === 'de' ? 'Nein, anderungen' : 'No, changes' },
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
        text: lang === 'de'
          ? 'Es gab einen Fehler beim Erstellen des Entwurfs.'
          : 'There was an error creating the draft.',
        metadata: { language: lang, shouldLog: true },
      },
      eventsCreated: 0,
      success: false,
      latencyMs: Date.now() - startTime,
    };
  }
}

// Singleton instance
export const pipeline = new ProcessingPipeline();
