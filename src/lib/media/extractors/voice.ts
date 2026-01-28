/**
 * Voice Content Extractor
 * 
 * Transcribes voice messages using OpenAI Whisper.
 * Includes dialect normalization for Austrian German.
 */

import type { ExtractionResult, MediaContext } from '../processor';

/**
 * Extract text from voice message via transcription
 */
export async function extractVoiceContent(
  buffer: Buffer,
  mimeType: string,
  context: MediaContext
): Promise<ExtractionResult> {
  void context;
  try {
    // Import OpenAI dynamically
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Determine file extension from mimeType
    const ext = mimeTypeToExtension(mimeType);
    
    // Create a File-like object for the API
    // Convert Buffer to Uint8Array to avoid TypeScript Buffer/BlobPart incompatibility
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    const file = new File([blob], `voice.${ext}`, { type: mimeType });
    
    // Transcribe with Whisper
    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'de', // Austrian German
      prompt: 'Österreichisches Deutsch, Familienkalender, Termine, Schule, Arzt',
    });
    
    const text = transcription.text?.trim() || '';
    
    if (!text) {
      return {
        text: '',
        documentType: 'voice_empty',
        error: 'Could not understand the voice message. Please try again.',
      };
    }
    
    console.log(`[VoiceExtractor] Transcribed: "${text.substring(0, 100)}..."`);
    
    // Optionally normalize dialect (kept simple for now)
    const normalizedText = normalizeAustrianDialect(text);
    
    return {
      text: normalizedText,
      documentType: 'voice',
      confidence: 0.75, // Whisper is generally reliable
    };
    
  } catch (error) {
    console.error('[VoiceExtractor] Transcription error:', error);
    return {
      text: '',
      documentType: 'voice_error',
      error: 'Could not process the voice message. Please try again.',
    };
  }
}

/**
 * Convert MIME type to file extension
 */
function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };
  return map[mimeType.toLowerCase()] || 'ogg';
}

/**
 * Simple Austrian dialect normalization
 * Maps common dialect words to standard German
 */
function normalizeAustrianDialect(text: string): string {
  const dialectMap: Record<string, string> = {
    // Common Austrian → Standard German
    'heut': 'heute',
    'morgn': 'morgen',
    'gscheid': 'vernünftig',
    'nix': 'nichts',
    'ned': 'nicht',
    'net': 'nicht',
    'wos': 'was',
    'hob': 'habe',
    'hom': 'haben',
    'san': 'sind',
    'is': 'ist',
    'heit': 'heute',
    'nochm': 'nachmittag',
    'vormi': 'vormittag',
  };
  
  let result = text;
  for (const [dialect, standard] of Object.entries(dialectMap)) {
    // Replace whole words only
    const regex = new RegExp(`\\b${dialect}\\b`, 'gi');
    result = result.replace(regex, standard);
  }
  
  return result;
}
