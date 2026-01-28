/**
 * PDF Content Extractor
 * 
 * Extracts text from PDF documents using pdf-parse.
 * Falls back hints for scanned/image-only PDFs.
 */

import { PDFParse } from 'pdf-parse';
import type { ExtractionResult, MediaContext } from '../processor';

/**
 * Extract text content from a PDF buffer
 */
export async function extractPDFContent(
  buffer: Buffer,
  context: MediaContext
): Promise<ExtractionResult> {
  void context;
  try {
    // Convert Buffer to Uint8Array for PDFParse
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParse({ data: uint8Array });
    const result = await parser.getText();
    
    // Cleanup parser resources
    await parser.destroy();
    
    const text = result.text.trim();
    
    if (!text || text.length < 10) {
      return {
        text: '',
        documentType: 'pdf_empty',
        error: 'The PDF appears to be empty or contains only images. Try sending it as a photo instead.',
      };
    }
    
    console.log(`[PDFExtractor] Extracted ${text.length} chars from PDF`);
    
    return {
      text,
      documentType: 'pdf',
      confidence: 0.8, // PDF text is generally reliable
    };
    
  } catch (error) {
    console.error('[PDFExtractor] Parse error:', error);
    return {
      text: '',
      documentType: 'pdf_error',
      error: 'Could not read PDF - it may be corrupted or password-protected.',
    };
  }
}
