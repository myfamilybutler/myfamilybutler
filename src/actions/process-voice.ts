'use server';

/**
 * Process Voice Server Action
 * 
 * Transcribes voice messages to text using Whisper.
 * Works with any audio buffer (WhatsApp, Telegram, etc.)
 */

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { getWhisperContextPrompt, buildDialectNormalizerPrompt } from '@/lib/ai/prompts';
import type { VoiceProcessingResult } from '@/lib/ai/types';

const VOICE_CONFIG = {
  normalizeDialect: true,
  whisperModel: 'whisper-1' as const,
  normalizerModel: 'gpt-4o-mini' as const,
};

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

// ===========================================
// Transcription
// ===========================================

async function transcribe(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg'
): Promise<{ transcript: string; duration?: number }> {
  const openai = getOpenAI();
  
  const extensionMap: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };
  const extension = extensionMap[mimeType] || 'ogg';
  
  const file = await toFile(audioBuffer, `voice.${extension}`, { type: mimeType });
  
  console.log('[Voice] Transcribing...');
  
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: VOICE_CONFIG.whisperModel,
    language: 'de',
    prompt: getWhisperContextPrompt(),
    response_format: 'verbose_json',
  });
  
  console.log(`[Voice] Transcript: "${transcription.text}"`);
  
  return {
    transcript: transcription.text,
    duration: transcription.duration,
  };
}

// ===========================================
// Dialect Normalization (Austrian → Standard German)
// ===========================================

async function normalizeDialect(transcript: string): Promise<string> {
  if (!VOICE_CONFIG.normalizeDialect || transcript.length < 10) {
    return transcript;
  }
  
  const openai = getOpenAI();
  
  console.log('[Voice] Normalizing dialect...');
  
  try {
    const completion = await openai.chat.completions.create({
      model: VOICE_CONFIG.normalizerModel,
      messages: [
        { role: 'system', content: buildDialectNormalizerPrompt() },
        { role: 'user', content: transcript },
      ],
      max_tokens: 500,
      temperature: 0,
    });
    
    const normalized = completion.choices[0]?.message?.content?.trim();
    
    if (normalized && normalized.length > 0) {
      console.log(`[Voice] Normalized: "${normalized}"`);
      return normalized;
    }
  } catch (error) {
    console.error('[Voice] Normalization failed:', error);
  }
  
  return transcript;
}

// ===========================================
// Main Function
// ===========================================

export interface ProcessVoiceInput {
  /** The audio file buffer */
  audioBuffer: Buffer;
  /** Audio MIME type (default: audio/ogg) */
  mimeType?: string;
}

export async function processVoiceMessage(
  input: ProcessVoiceInput
): Promise<VoiceProcessingResult> {
  const { audioBuffer, mimeType = 'audio/ogg' } = input;
  
  console.log(`[Voice] Processing: ${audioBuffer.length} bytes`);
  
  try {
    const { transcript, duration } = await transcribe(audioBuffer, mimeType);
    
    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        transcript: '',
        normalizedText: '',
        error: 'No speech detected',
      };
    }
    
    const normalizedText = await normalizeDialect(transcript);
    
    return {
      success: true,
      transcript,
      normalizedText,
      durationSeconds: duration,
    };
    
  } catch (error) {
    console.error('[Voice] Error:', error);
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
