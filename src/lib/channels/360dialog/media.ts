/**
 * 360dialog Media Processing
 * 
 * Handles image and voice message processing for the 360dialog channel.
 * Mirrors the structure of whatsapp-media.ts.
 */

import { send360DialogMessage, download360DialogMedia } from './send';
import { logMessage, createEvent } from '@/lib/supabase';
import { processLocalImage } from '@/actions/process-vision';
import { processLocalAudio } from '@/actions/process-voice';
import { parseEventWithFallback } from '@/lib/ai';

// ===========================================
// Types
// ===========================================

export interface MediaContext {
  userId: string;
  phoneNumber: string;
  householdId: string | null;
  messageId: string;
}

export interface MediaResult {
  handled: boolean;
  eventsCreated?: number;
}

// ===========================================
// Messages
// ===========================================

const MESSAGES = {
  image: {
    processing: '📷 Bild wird verarbeitet...',
    noFamily: '📷 Um Bilder zu verarbeiten, musst du zuerst einer Familie beitreten. Tippe "dashboard" um loszulegen.',
    success: (count: number, events: string) => 
      `📅 *${count} Termin(e) erkannt und gespeichert!*\n\n${events}\n\n✅ Check dein Dashboard für Details.`,
    clarification: (question: string) => `🤔 ${question}`,
    noEvents: '📷 Bild erhalten! Ich konnte leider keine Termine daraus extrahieren.\n\nTipp: Schick mir Fotos von Schulbriefen, Terminzetteln oder Einladungen.',
    error: '❌ Fehler bei der Bildverarbeitung. Bitte versuche es später erneut.',
  },
  voice: {
    processing: '🎙️ Einen Moment, ich höre mir deine Nachricht an...',
    noFamily: '🎙️ Um Sprachnachrichten zu verarbeiten, musst du zuerst einer Familie beitreten. Tippe "dashboard" um loszulegen.',
    success: (count: number, events: string) =>
      `📅 *${count} Termin(e) aus deiner Sprachnachricht erstellt!*\n\n${events}\n\n✅ Check dein Dashboard für Details.`,
    clarification: (question: string) => `🤔 ${question}`,
    noEvents: (transcription: string) =>
      `🎙️ Ich habe verstanden: "${transcription}"\n\nAber ich konnte leider keinen Termin daraus erkennen. Versuche es mit einem klaren Datum und Uhrzeit, z.B. "Zahnarzt am Montag um 10 Uhr".`,
    error: '❌ Ich konnte die Sprachnachricht leider nicht verstehen. Bitte versuche es erneut oder schick mir eine Textnachricht.',
    processingError: '❌ Fehler bei der Sprachverarbeitung. Bitte versuche es später erneut.',
  },
};

// ===========================================
// Image Processing
// ===========================================

export async function processImage(
  mediaId: string,
  mimeType: string,
  caption: string | undefined,
  context: MediaContext
): Promise<MediaResult> {
  const { userId, phoneNumber, householdId, messageId } = context;
  
  console.log(`[360dialog] Processing image from ${phoneNumber}`);
  
  if (!householdId) {
    await send360DialogMessage(phoneNumber, MESSAGES.image.noFamily);
    return { handled: true, eventsCreated: 0 };
  }
  
  try {
    // Download image from 360dialog
    const imageBuffer = await download360DialogMedia(mediaId);
    console.log(`[360dialog] Downloaded image: ${imageBuffer.length} bytes`);
    
    // Log the incoming image
    await logMessage(userId, 'user', caption || '[Bild empfangen]', 'image', messageId, '360dialog');
    
    // Process with Vision AI
    const result = await processLocalImage(imageBuffer, userId, householdId, mimeType);
    
    if (result.success && result.eventsCreated > 0) {
      const eventList = result.events
        .map(e => `• ${e.title} (${e.event_date})`)
        .join('\n');
      
      const successMessage = MESSAGES.image.success(result.eventsCreated, eventList);
      await send360DialogMessage(phoneNumber, successMessage);
      await logMessage(userId, 'assistant', successMessage, 'text', undefined, '360dialog');
      return { handled: true, eventsCreated: result.eventsCreated };
    }
    
    if (result.clarificationNeeded && result.clarificationQuestion) {
      const clarifyMessage = MESSAGES.image.clarification(result.clarificationQuestion);
      await send360DialogMessage(phoneNumber, clarifyMessage);
      await logMessage(userId, 'assistant', clarifyMessage, 'text', undefined, '360dialog');
    } else {
      await send360DialogMessage(phoneNumber, MESSAGES.image.noEvents);
      await logMessage(userId, 'assistant', MESSAGES.image.noEvents, 'text', undefined, '360dialog');
    }
    
    return { handled: true, eventsCreated: 0 };
  } catch (error) {
    console.error('[360dialog] Vision processing error:', error);
    await send360DialogMessage(phoneNumber, MESSAGES.image.error);
    return { handled: true, eventsCreated: 0 };
  }
}

// ===========================================
// Voice Processing
// ===========================================

export async function processVoice(
  mediaId: string,
  mimeType: string,
  context: MediaContext
): Promise<MediaResult> {
  const { userId, phoneNumber, householdId, messageId } = context;
  
  console.log(`[360dialog] Processing voice message from ${phoneNumber}`);
  
  if (!householdId) {
    await send360DialogMessage(phoneNumber, MESSAGES.voice.noFamily);
    return { handled: true, eventsCreated: 0 };
  }
  
  try {
    // Send processing indicator
    await send360DialogMessage(phoneNumber, MESSAGES.voice.processing);
    
    // Download audio from 360dialog
    const audioBuffer = await download360DialogMedia(mediaId);
    console.log(`[360dialog] Downloaded audio: ${audioBuffer.length} bytes`);
    
    // Log the incoming voice message
    await logMessage(userId, 'user', '[Sprachnachricht]', 'voice', messageId, '360dialog');
    
    // Process audio with Whisper
    const voiceResult = await processLocalAudio(audioBuffer, mimeType);
    
    if (!voiceResult.success) {
      console.error(`[360dialog] Voice processing error: ${voiceResult.error}`);
      await send360DialogMessage(phoneNumber, MESSAGES.voice.error);
      await logMessage(userId, 'assistant', MESSAGES.voice.error, 'text', undefined, '360dialog');
      return { handled: true, eventsCreated: 0 };
    }
    
    console.log(`[360dialog] Transcription: "${voiceResult.normalizedText}"`);
    
    // Extract events from transcribed text
    const extraction = await parseEventWithFallback(voiceResult.normalizedText, undefined, []);
    
    const confidence = extraction.confidence ?? (extraction.events.length > 0 ? 0.75 : 0.3);
    
    console.log(`[360dialog] Extracted ${extraction.events.length} events, confidence: ${confidence}`);
    
    // If events were found with high confidence, save them
    if (extraction.events.length > 0 && confidence >= 0.70) {
      let eventsCreated = 0;
      const savedEvents: { title: string; event_date: string }[] = [];
      
      for (const event of extraction.events) {
        const created = await createEvent(householdId, userId, {
          title: event.title,
          event_date: event.event_date,
          event_time: event.event_time ?? undefined,
          end_time: event.end_time ?? undefined,
          is_all_day: event.is_all_day,
          family_member: event.family_member ?? undefined,
          location: event.location ?? undefined,
          description: event.description ?? undefined,
        });
        
        if (created) {
          eventsCreated++;
          savedEvents.push({ title: event.title, event_date: event.event_date });
        }
      }
      
      if (eventsCreated > 0) {
        const eventList = savedEvents.map(e => `• ${e.title} (${e.event_date})`).join('\n');
        const successMessage = MESSAGES.voice.success(eventsCreated, eventList);
        await send360DialogMessage(phoneNumber, successMessage);
        await logMessage(userId, 'assistant', successMessage, 'text', undefined, '360dialog');
        return { handled: true, eventsCreated };
      }
    }
    
    // No events found or needs clarification
    if (extraction.needs_clarification && extraction.clarification_question) {
      const clarifyMessage = MESSAGES.voice.clarification(extraction.clarification_question);
      await send360DialogMessage(phoneNumber, clarifyMessage);
      await logMessage(userId, 'assistant', clarifyMessage, 'text', undefined, '360dialog');
    } else {
      const noEventsMessage = MESSAGES.voice.noEvents(voiceResult.normalizedText);
      await send360DialogMessage(phoneNumber, noEventsMessage);
      await logMessage(userId, 'assistant', noEventsMessage, 'text', undefined, '360dialog');
    }
    
    return { handled: true, eventsCreated: 0 };
  } catch (error) {
    console.error('[360dialog] Voice processing error:', error);
    await send360DialogMessage(phoneNumber, MESSAGES.voice.processingError);
    return { handled: true, eventsCreated: 0 };
  }
}
