/**
 * Word Document Extractor
 * 
 * Extracts text from Word documents (.docx) using mammoth.
 */

import mammoth from 'mammoth';
import type { ExtractionResult, MediaContext } from '../processor';

/**
 * Extract text content from a Word document
 */
export async function extractWordContent(
  buffer: Buffer,
  context: MediaContext
): Promise<ExtractionResult> {
  void context;
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    
    if (!text || text.length < 10) {
      return {
        text: '',
        documentType: 'word_empty',
        error: 'Das Word-Dokument scheint leer zu sein.',
      };
    }
    
    console.log(`[WordExtractor] Extracted ${text.length} chars from Word document`);
    
    // Log any warnings from mammoth
    if (result.messages.length > 0) {
      console.log('[WordExtractor] Warnings:', result.messages);
    }
    
    return {
      text,
      documentType: 'word',
      confidence: 0.8,
    };
    
  } catch (error) {
    console.error('[WordExtractor] Parse error:', error);
    return {
      text: '',
      documentType: 'word_error',
      error: 'Konnte das Word-Dokument nicht lesen. Ist es beschädigt?',
    };
  }
}
