/**
 * Media Processor - Channel-Agnostic Media Processing
 * 
 * Single entry point for all media types across all channels.
 * Routes to appropriate extractor based on mimeType.
 * 
 * Usage:
 *   const buffer = await adapter.downloadMedia(mediaRef);
 *   const result = await processMedia({ buffer, ...mediaRef }, context);
 */

import type { BrainResult, ParsedEvent } from '@/lib/ai/types';
import { extractPDFContent } from './extractors/pdf';
import { extractImageContent } from './extractors/image';
import { extractVoiceContent } from './extractors/voice';
import { extractWordContent } from './extractors/word';
import { extractExcelContent } from './extractors/excel';
import { extractTextContent } from './extractors/text';

// ===========================================
// Types
// ===========================================

export interface MediaBuffer {
  /** Raw media bytes */
  buffer: Buffer;
  /** MIME type (e.g., 'application/pdf', 'image/jpeg') */
  mimeType: string;
  /** Original filename (for documents) */
  filename?: string;
  /** Caption (for images/videos) */
  caption?: string;
}

export interface MediaContext {
  userId: string;
  householdId: string | null;
  messageId?: string;
  familyMembers?: string[];
}

export interface ExtractionResult {
  /** Extracted text content */
  text: string;
  /** Extracted events (if pre-processed by vision) */
  events?: ParsedEvent[];
  /** Confidence score (0-1) */
  confidence?: number;
  /** Document type classification */
  documentType?: string;
  /** Error message if extraction failed */
  error?: string;
}

// ===========================================
// MIME Type Detection
// ===========================================

const MIME_MAP = {
  pdf: ['application/pdf'],
  word: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ],
  text: ['text/plain'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  voice: ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm'],
};

type MediaCategory = keyof typeof MIME_MAP | 'unknown';

function detectCategory(mimeType: string): MediaCategory {
  const normalized = mimeType.toLowerCase();
  
  for (const [category, types] of Object.entries(MIME_MAP)) {
    if (types.some(t => normalized === t || normalized.includes(t))) {
      return category as keyof typeof MIME_MAP;
    }
  }
  
  // Fallback checks for generic types
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('audio/')) return 'voice';
  
  return 'unknown';
}

// ===========================================
// Main Processor
// ===========================================

/**
 * Process any media type and extract actionable content
 * 
 * This is the channel-agnostic entry point. All channels should:
 * 1. Download media using their adapter's downloadMedia()
 * 2. Call processMedia() with the buffer
 * 3. Handle the result (same code for all channels)
 */
export async function processMedia(
  media: MediaBuffer,
  context: MediaContext
): Promise<BrainResult> {
  const category = detectCategory(media.mimeType);
  
  console.log(`[MediaProcessor] Processing ${category} (${media.mimeType}) for user ${context.userId}`);
  
  try {
    let extraction: ExtractionResult;
    
    switch (category) {
      case 'pdf':
        extraction = await extractPDFContent(media.buffer, context);
        break;
        
      case 'word':
        extraction = await extractWordContent(media.buffer, context);
        break;
        
      case 'excel':
        extraction = await extractExcelContent(media.buffer, context);
        break;
        
      case 'text':
        extraction = await extractTextContent(media.buffer, context);
        break;
        
      case 'image':
        extraction = await extractImageContent(media.buffer, media.mimeType, context);
        break;
        
      case 'voice':
        extraction = await extractVoiceContent(media.buffer, media.mimeType, context);
        break;
        
      default:
        return {
          action: 'none',
          events: [],
          confidence: 0,
          error: `Nicht unterstützter Dateityp: ${media.mimeType}. Unterstützt: PDF, Word, Excel, Text, Bilder, Sprachnachrichten.`,
        };
    }
    
    // Handle extraction errors
    if (extraction.error) {
      return {
        action: 'none',
        events: [],
        confidence: 0,
        error: extraction.error,
      };
    }
    
    // If extractor already returned events (vision), use those
    if (extraction.events && extraction.events.length > 0) {
      const confidence = extraction.confidence ?? 0.75;
      return {
        action: confidence >= 0.70 ? 'save' : confidence >= 0.40 ? 'draft' : 'ask',
        events: extraction.events,
        confidence,
        documentType: extraction.documentType,
        processedText: extraction.text,
      };
    }
    
    // Otherwise, parse extracted text through AI (for documents/voice)
    if (extraction.text && extraction.text.length > 0) {
      const { parseEventWithFallback } = await import('@/lib/ai');
      const result = await parseEventWithFallback(extraction.text, undefined, context.familyMembers);
      const confidence = result.confidence ?? (result.events.length > 0 ? 0.75 : 0.3);
      
      return {
        action: result.events.length === 0 
          ? 'none' 
          : confidence >= 0.70 ? 'save' : confidence >= 0.40 ? 'draft' : 'ask',
        events: result.events,
        confidence,
        documentType: extraction.documentType,
        processedText: extraction.text,
        clarificationQuestion: result.clarification_question,
      };
    }
    
    // No content extracted
    return {
      action: 'none',
      events: [],
      confidence: 0,
      processedText: '',
      error: 'Kein Inhalt konnte aus der Datei extrahiert werden.',
    };
    
  } catch (error) {
    console.error('[MediaProcessor] Processing error:', error);
    return {
      action: 'none',
      events: [],
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unbekannter Verarbeitungsfehler',
    };
  }
}

// ===========================================
// Convenience Functions
// ===========================================

/**
 * Check if a MIME type is supported
 */
export function isSupportedMediaType(mimeType: string): boolean {
  return detectCategory(mimeType) !== 'unknown';
}

/**
 * Get human-readable description of supported types
 */
export function getSupportedTypesDescription(): string {
  return 'PDF, Word (.docx), Excel (.xlsx), Text, Bilder (JPG, PNG) und Sprachnachrichten';
}
