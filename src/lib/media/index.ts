/**
 * Media Processing Module
 * 
 * Channel-agnostic media processing for all channels.
 * Supports PDF, Word, Excel, Text, images, and voice messages.
 */

export { 
  processMedia, 
  isSupportedMediaType, 
  getSupportedTypesDescription,
  type MediaBuffer,
  type MediaContext,
  type ExtractionResult,
} from './processor';

// Individual extractors (for direct use if needed)
export { extractPDFContent } from './extractors/pdf';
export { extractWordContent } from './extractors/word';
export { extractExcelContent } from './extractors/excel';
export { extractTextContent } from './extractors/text';
export { extractImageContent } from './extractors/image';
export { extractVoiceContent } from './extractors/voice';
