/**
 * AI Module - Shared Types
 * 
 * Central type definitions for AI parsing results.
 * Used by both OpenAI and Gemini providers.
 */

/**
 * A parsed calendar event extracted from user message
 */
export interface ParsedEvent {
  title: string;
  event_date: string; // YYYY-MM-DD format
  event_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
}

/**
 * Result of event extraction from AI
 */
export interface EventExtractionResult {
  events: ParsedEvent[];
  needs_clarification: boolean;
  clarification_question?: string;
  intent_type: 'calendar_event' | 'reminder' | 'unknown';
}

/**
 * A parsed reminder from user message
 */
export interface ParsedReminder {
  task: string;
  datetime: Date;
}
