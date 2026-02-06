/**
 * AI Module - Shared Types
 * 
 * Central type definitions for AI parsing results.
 * Used by both OpenAI and Gemini providers.
 */

import type { ChatMessage } from '@/types';

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
  confidence?: number; // 0-1 confidence score
  missing_info?: string; // What information is unclear
}

/**
 * A parsed reminder from user message
 */
export interface ParsedReminder {
  task: string;
  datetime: Date;
}

// ===========================================
// Voice Processing Types
// ===========================================

/**
 * Result of voice transcription and normalization
 */
export interface VoiceProcessingResult {
  success: boolean;
  /** Raw transcript from Whisper */
  transcript: string;
  /** Normalized text (dialect → standard German) */
  normalizedText: string;
  /** Audio duration in seconds */
  durationSeconds?: number;
  /** Error message if failed */
  error?: string;
}

// ===========================================
// Unified Brain Types
// ===========================================

/**
 * Input type identifier for the Brain
 */
export type InputType = 'text' | 'image' | 'voice' | 'document';

/**
 * Media attachment for processing
 */
export interface MediaAttachment {
  /** The file buffer */
  buffer: Buffer;
  /** MIME type (e.g., 'image/jpeg', 'audio/ogg', 'application/pdf') */
  mimeType: string;
  /** Original filename if available */
  filename?: string;
}

/**
 * Unified input for the Brain to process
 */
export interface UnifiedInput {
  type: InputType;
  /** For text/document: the message content */
  content?: string;
  /** For media types (image/voice/document): the downloaded file */
  attachment?: MediaAttachment;
  /** User context */
  userId: string;
  householdId: string;
  /** Message ID for source tracking */
  messageId?: string;
  /** Family members for matching */
  familyMembers?: string[];
  /** Recent chat messages used for disambiguation */
  conversationHistory?: ChatMessage[];
  /** Phone number for WhatsApp responses */
  phoneNumber?: string;
}

/**
 * Brain action after processing input
 */
export type BrainAction = 'save' | 'draft' | 'ask' | 'none';

/**
 * Result from the Brain after processing any input type
 */
export interface BrainResult {
  /** What action to take */
  action: BrainAction;
  /** Extracted events (if any) */
  events: ParsedEvent[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Clarification question if action is 'ask' */
  clarificationQuestion?: string;
  /** Document type for images */
  documentType?: string;
  /** Raw/normalized text from processing */
  processedText?: string;
  /** Error message if failed */
  error?: string;
}

// ===========================================
// Draft Event Types
// ===========================================

/**
 * A draft event awaiting user confirmation
 */
export interface DraftEvent extends ParsedEvent {
  /** Unique ID for the draft */
  draftId: string;
  /** When the draft was created */
  createdAt: Date;
  /** Original source message */
  sourceText?: string;
  /** Why it was marked as draft */
  reason: 'low_confidence' | 'missing_info' | 'user_requested';
  /** Confidence score from extraction */
  confidence: number;
}

/**
 * Status of draft confirmation flow
 */
export type DraftStatus = 'pending' | 'confirmed' | 'rejected' | 'expired';
