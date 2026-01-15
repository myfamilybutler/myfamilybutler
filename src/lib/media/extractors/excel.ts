/**
 * Excel Document Extractor
 * 
 * Extracts text/data from Excel files (.xlsx, .xls) using xlsx.
 */

import * as XLSX from 'xlsx';
import type { ExtractionResult, MediaContext } from '../processor';

/**
 * Extract text content from an Excel spreadsheet
 */
export async function extractExcelContent(
  buffer: Buffer,
  _context: MediaContext
): Promise<ExtractionResult> {
  try {
    // Read workbook from buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    if (workbook.SheetNames.length === 0) {
      return {
        text: '',
        documentType: 'excel_empty',
        error: 'Die Excel-Datei enthält keine Arbeitsblätter.',
      };
    }
    
    // Extract text from all sheets
    const textParts: string[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      
      // Convert to CSV for text extraction
      const csv = XLSX.utils.sheet_to_csv(sheet);
      
      if (csv.trim()) {
        textParts.push(`--- ${sheetName} ---\n${csv}`);
      }
    }
    
    const text = textParts.join('\n\n').trim();
    
    if (!text || text.length < 10) {
      return {
        text: '',
        documentType: 'excel_empty',
        error: 'Die Excel-Datei scheint leer zu sein.',
      };
    }
    
    console.log(`[ExcelExtractor] Extracted ${text.length} chars from ${workbook.SheetNames.length} sheets`);
    
    return {
      text,
      documentType: 'excel',
      confidence: 0.75, // Slightly lower since spreadsheet data is less structured for event extraction
    };
    
  } catch (error) {
    console.error('[ExcelExtractor] Parse error:', error);
    return {
      text: '',
      documentType: 'excel_error',
      error: 'Konnte die Excel-Datei nicht lesen. Ist sie beschädigt?',
    };
  }
}
