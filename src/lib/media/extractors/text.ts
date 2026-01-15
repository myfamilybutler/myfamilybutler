/**
 * Plain Text Extractor
 * 
 * Handles plain text files (.txt)
 */

import type { ExtractionResult, MediaContext } from '../processor';

/**
 * Extract content from plain text file
 */
export async function extractTextContent(
  buffer: Buffer,
  _context: MediaContext
): Promise<ExtractionResult> {
  try {
    const text = buffer.toString('utf-8').trim();
    
    if (!text || text.length < 5) {
      return {
        text: '',
        documentType: 'text_empty',
        error: 'Die Textdatei scheint leer zu sein.',
      };
    }
    
    console.log(`[TextExtractor] Extracted ${text.length} chars from text file`);
    
    return {
      text,
      documentType: 'text',
      confidence: 0.85, // Plain text is very reliable
    };
    
  } catch (error) {
    console.error('[TextExtractor] Parse error:', error);
    return {
      text: '',
      documentType: 'text_error',
      error: 'Konnte die Textdatei nicht lesen.',
    };
  }
}
