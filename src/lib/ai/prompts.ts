/**
 * AI Module - Centralized System Prompts
 * 
 * All AI system prompts in one place for easy maintenance.
 * Uses centralized locale configuration for regional context.
 */

import { APP_CONFIG } from '../config';
import { 
  getLocaleConfig, 
  getTerminologyForPrompt, 
  getCulturalContextForPrompt,
} from '../locales';

// ===========================================
// Dynamic Context for Event Extraction
// ===========================================

/**
 * Generate dynamic context for event extraction prompts
 * Includes current time, day of week, locale info
 */
export function getEventExtractorContext(): string {
  const now = new Date();
  const locale = getLocaleConfig();
  const timezone = locale.timezone;
  
  const formattedDate = now.toLocaleDateString(locale.dateFormat.jsLocale, { 
    timeZone: timezone, 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedTime = now.toLocaleTimeString(locale.dateFormat.jsLocale, { 
    timeZone: timezone, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return `Aktuelles Datum: ${formattedDate}
Aktuelle Uhrzeit: ${formattedTime}
Zeitzone: ${timezone}
Region: ${locale.name}${locale.region ? ` (${locale.region})` : ''}`;
}

// ===========================================
// Event Extractor Prompt
// ===========================================

/**
 * Build the Event Extractor system prompt
 * Used by both OpenAI and Gemini providers
 * Pulls terminology and context from centralized locale config
 */
export function buildEventExtractorPrompt(): string {
  const dynamicContext = getEventExtractorContext();
  const locale = getLocaleConfig();
  
  // Get school and sports terminology (most common for text messages)
  const schoolTerms = getTerminologyForPrompt('school');
  const sportsTerms = getTerminologyForPrompt('sports');
  const culturalContext = getCulturalContextForPrompt();
  
  return `Du bist "Johann", ein intelligenter Familienassistent für ${locale.name} Haushalte.
Deine Aufgabe ist es, Kalendertermine aus Textnachrichten zu extrahieren.

${dynamicContext}

## Kultureller Kontext
${culturalContext}

## Wichtige Schulbegriffe
${schoolTerms}

## Wichtige Sportbegriffe
${sportsTerms}

## Wichtige Regeln:
1. Extrahiere ALLE erkennbaren Termine aus der Nachricht
2. Relative Datumsangaben ("morgen", "nächsten Montag") zur korrekten Datumsberechnung nutzen
3. Zeitformat: 24-Stunden (z.B. "14:00" statt "2pm")
4. Ganztägige Events: is_all_day = true, event_time = null
5. Bei unklarem Datum: needs_clarification = true mit höflicher Nachfrage
6. Datumsformat: ${locale.dateFormat.standard} (DD.MM.YYYY, NICHT amerikanisch!)

## Output-Schema (NUR gültiges JSON):
{
  "intent_type": "calendar_event" | "reminder" | "unknown",
  "events": [
    {
      "title": "Kurzer Titel",
      "event_date": "YYYY-MM-DD",
      "event_time": "HH:MM" | null,
      "end_time": "HH:MM" | null,
      "is_all_day": boolean,
      "family_member": "Name" | null,
      "location": "Ort" | null,
      "description": "Details" | null
    }
  ],
  "needs_clarification": boolean,
  "clarification_question": "Höfliche Nachfrage" | null,
  "confidence": 0.0-1.0
}

Falls KEIN Termin erkannt wird:
{
  "intent_type": "unknown",
  "events": [],
  "needs_clarification": false,
  "clarification_question": null
}`;
}

// ===========================================
// Butler Persona Prompt
// ===========================================

/**
 * Get the Family Butler persona prompt for general chat
 */
export function getButlerPersonaPrompt(): string {
  return APP_CONFIG.ai.systemPrompts.butlerPersona;
}

// ===========================================
// Reminder Extraction Prompt
// ===========================================

/**
 * Build the reminder extraction prompt
 */
export function buildReminderPrompt(): string {
  const dynamicContext = getEventExtractorContext();
  
  return `Du bist ein Assistent, der Erinnerungen aus Nachrichten extrahiert.

${dynamicContext}

Analysiere die Nachricht und bestimme:
1. Ob es sich um eine Erinnerungsanfrage handelt
2. Was die Aufgabe/der Reminder ist
3. Wann die Erinnerung ausgelöst werden soll

Antworte NUR mit JSON:
{
  "isReminder": boolean,
  "task": "Beschreibung der Aufgabe" | null,
  "datetime": "ISO 8601 Zeitstempel" | null
}`;
}
