/**
 * Base Media Handler
 * 
 * Shared logic for processing media messages (voice, image) across channels.
 * WhatsApp and Telegram handlers extend this to reduce code duplication.
 */

import { logMessage, createEvent, createDraftEvent } from '@/lib/supabase';
import { APP_CONFIG } from '@/lib/config';
import type { BrainResult, ParsedEvent } from '@/lib/ai/types';

// ===========================================
// Configuration
// ===========================================

export const MEDIA_CONFIG = {
  /** Confidence threshold for auto-save (above = save, below = ask/draft) */
  confidenceThreshold: 0.70,
  /** Minimum confidence to save as draft (below = ask clarification) */
  draftThreshold: 0.40,
};

// ===========================================
// Types
// ===========================================

export interface MediaContext {
  userId: string;
  householdId: string | null;
  messageId: string;
  familyMembers?: string[];
}

export interface MediaResult {
  handled: boolean;
  eventsCreated?: number;
  draftsCreated?: number;
}

export type MediaInputType = 'voice' | 'image' | 'document';

/**
 * Channel-specific message sender interface
 */
export interface MessageSender {
  send(text: string): Promise<void>;
}

// ===========================================
// Shared Response Messages
// ===========================================

export const MESSAGES = {
  voice: {
    processing: '🎙️ Sprachnachricht wird verarbeitet...',
    errorUnderstand: '❌ Ich konnte die Sprachnachricht leider nicht verstehen. Könntest du es nochmal probieren?',
    errorProcess: '❌ Ich konnte die Sprachnachricht leider nicht laden. Bitte versuche es erneut.',
    noFamily: 'Um Termine aus Sprachnachrichten zu erstellen, musst du zuerst einer Familie beitreten. Tippe "dashboard" um loszulegen.',
    noEvents: (text: string) => text 
      ? `🎙️ Ich habe verstanden: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\nIch konnte aber keinen Termin daraus erkennen. Versuche es mit einem klaren Datum und einer Uhrzeit!`
      : '❓ Ich konnte leider keinen Termin erkennen. Versuche es mit einem klaren Datum!',
  },
  image: {
    errorProcess: '❌ Ich konnte das Bild leider nicht verarbeiten. Ist der Text deutlich lesbar?',
    noFamily: '📸 Danke für das Bild! Um Termine zu speichern, musst du zuerst einer Familie beitreten. Tippe "dashboard" um loszulegen.',
    noEvents: '📸 Danke für das Bild! Ich konnte leider keine Termine darin erkennen. Enthält es Datumsangaben?',
  },
  document: {
    errorProcess: '❌ Ich konnte das Dokument leider nicht verarbeiten. Ist es ein gültiges Dateiformat?',
    noFamily: '📄 Danke für das Dokument! Um Termine zu speichern, musst du zuerst einer Familie beitreten. Tippe "dashboard" um loszulegen.',
    noEvents: '📄 Danke für das Dokument! Ich konnte leider keine Termine darin erkennen. Enthält es Datumsangaben?',
  },
  shared: {
    genericError: '❌ Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
    askClarification: 'Ich konnte leider nicht alles verstehen. Könntest du mir mehr Details geben?',
    draftNotice: (eventsDesc: string) => 
      `Ich habe folgende Termine erkannt:\n\n${eventsDesc}\n\n⚠️ Bitte prüfe diese im Dashboard, da ich mir nicht 100% sicher bin.\nTippe "dashboard" um sie zu bestätigen.`,
  },
};

// ===========================================
// Shared Formatting Functions
// ===========================================

/**
 * Format confirmation message for created events
 */
export function formatEventConfirmation(
  events: ParsedEvent[], 
  inputTypeEmoji: string = '✅'
): string {
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
    
    return `${inputTypeEmoji} Termin erstellt!\n\n*${event.title}*${memberStr}\n🗓️ ${formattedDate}${timeStr}${locationStr}`;
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
  
  return `${inputTypeEmoji} ${events.length} Termine erstellt!\n\n${eventList}\n\n✅ Alle Termine wurden gespeichert!`;
}

/**
 * Format events list for draft notification
 */
export function formatEventsList(events: ParsedEvent[]): string {
  return events.map(e => {
    const dateObj = new Date(e.event_date);
    const formattedDate = dateObj.toLocaleDateString(APP_CONFIG.localization.locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = e.event_time ? ` um ${e.event_time}` : '';
    return `• *${e.title}* - ${formattedDate}${timeStr}`;
  }).join('\n');
}

// ===========================================
// Shared Action Handlers
// ===========================================

/**
 * Determine action based on confidence
 */
export function determineAction(
  confidence: number,
  hasEvents: boolean,
  needsClarification: boolean,
  clarificationQuestion?: string
): { action: 'save' | 'draft' | 'ask' | 'none'; question?: string } {
  if (!hasEvents) {
    if (needsClarification) {
      return { action: 'ask', question: clarificationQuestion };
    }
    return { action: 'none' };
  }
  
  if (confidence >= MEDIA_CONFIG.confidenceThreshold) {
    return { action: 'save' };
  }
  
  if (confidence >= MEDIA_CONFIG.draftThreshold) {
    return { action: 'draft' };
  }
  
  return { 
    action: 'ask', 
    question: clarificationQuestion || MESSAGES.shared.askClarification,
  };
}

/**
 * Save events to database
 * Uses Promise.allSettled to avoid N+1 query pattern (parallel inserts)
 */
export async function saveEvents(
  events: ParsedEvent[],
  context: MediaContext
): Promise<number> {
  const { userId, householdId, messageId } = context;
  
  if (!householdId) return 0;
  
  // Parallel event creation to avoid N+1
  const results = await Promise.allSettled(
    events.map(event =>
      createEvent(householdId, userId, {
        title: event.title,
        event_date: event.event_date,
        event_time: event.event_time,
        end_time: event.end_time,
        is_all_day: event.is_all_day,
        family_member: event.family_member,
        location: event.location,
        description: event.description,
        source_message_id: messageId,
      })
    )
  );
  
  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

/**
 * Save events as drafts
 * Uses Promise.allSettled to avoid N+1 query pattern (parallel inserts)
 */
export async function saveDrafts(
  events: ParsedEvent[],
  confidence: number,
  context: MediaContext
): Promise<number> {
  const { userId, householdId } = context;
  
  if (!householdId) return 0;
  
  // Parallel draft creation to avoid N+1
  const results = await Promise.allSettled(
    events.map(event =>
      createDraftEvent(householdId, userId, {
        ...event,
        reason: 'low_confidence',
        confidence,
      })
    )
  );
  
  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

/**
 * Log assistant message
 */
export async function logAssistantMessage(
  userId: string,
  message: string
): Promise<void> {
  await logMessage(userId, 'assistant', message, 'text');
}

// ===========================================
// Unified Brain Result Handler
// ===========================================

/**
 * Handle Brain result with channel-specific sender
 * This is the core shared logic that both WhatsApp and Telegram use
 */
export async function handleBrainResult(
  result: BrainResult,
  context: MediaContext,
  inputType: MediaInputType,
  sender: MessageSender
): Promise<MediaResult> {
  const { userId } = context;
  const emoji = inputType === 'voice' ? '🎙️' : '📸';
  
  console.log(`[MediaHandler] Brain result: action=${result.action}, events=${result.events.length}, confidence=${result.confidence}`);
  
  // Handle errors
  if (result.error) {
    console.error(`[MediaHandler] Brain error: ${result.error}`);
    const errorMsg = inputType === 'voice' 
      ? MESSAGES.voice.errorUnderstand 
      : MESSAGES.image.errorProcess;
    
    await sender.send(errorMsg);
    await logAssistantMessage(userId, errorMsg);
    return { handled: true, eventsCreated: 0 };
  }
  
  // Route based on action
  switch (result.action) {
    case 'save': {
      const createdCount = await saveEvents(result.events, context);
      const confirmMsg = formatEventConfirmation(result.events, `${emoji}✅`);
      await sender.send(confirmMsg);
      await logAssistantMessage(userId, confirmMsg);
      return { handled: true, eventsCreated: createdCount };
    }
    
    case 'draft': {
      const draftsCreated = await saveDrafts(result.events, result.confidence, context);
      const eventsDesc = formatEventsList(result.events);
      const draftMsg = `${emoji} ${MESSAGES.shared.draftNotice(eventsDesc)}`;
      await sender.send(draftMsg);
      await logAssistantMessage(userId, draftMsg);
      return { handled: true, draftsCreated };
    }
    
    case 'ask': {
      const question = result.clarificationQuestion || MESSAGES.shared.askClarification;
      const askMsg = `${emoji} ${question}`;
      await sender.send(askMsg);
      await logAssistantMessage(userId, askMsg);
      return { handled: true };
    }
    
    case 'none':
    default: {
      let noEventMsg: string;
      if (inputType === 'voice') {
        noEventMsg = MESSAGES.voice.noEvents(result.processedText || '');
      } else {
        noEventMsg = MESSAGES.image.noEvents;
      }
      await sender.send(noEventMsg);
      await logAssistantMessage(userId, noEventMsg);
      return { handled: true, eventsCreated: 0 };
    }
  }
}
