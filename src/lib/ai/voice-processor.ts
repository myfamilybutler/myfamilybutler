/**
 * Internal Voice Processor
 *
 * Transcribes voice messages to text using Whisper.
 * This is a regular server-side module (not a Server Action).
 */

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { getWhisperContextPrompt, buildDialectNormalizerPrompt } from '@/lib/ai/prompts';
import type { VoiceProcessingResult } from '@/lib/ai/types';
export type { VoiceProcessingResult } from '@/lib/ai/types';
import { log, logError } from '@/lib/utils/logger';

// ===========================================
// Validation / Guardrails
// ===========================================

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_AUDIO_TYPES = [
  'audio/ogg',
  'audio/opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
];

export function validateVoiceInput(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg'
): { valid: true } | { valid: false; error: string } {
  if (audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
    return { valid: false, error: `Audio too large (max ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024} MB)` };
  }
  if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
    return { valid: false, error: `Unsupported audio type: ${mimeType}` };
  }
  return { valid: true };
}

// ===========================================
// Types
// ===========================================

export interface ProcessVoiceInput {
  /** The audio file buffer */
  audioBuffer: Buffer;
  /** Audio MIME type (default: audio/ogg) */
  mimeType?: string;
}

// ===========================================
// OpenAI Client
// ===========================================

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

  log.info('[Voice] Transcribing...');

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'de',
    prompt: getWhisperContextPrompt(),
    response_format: 'verbose_json',
  });

  log.info(`[Voice] Transcript: "${transcription.text}"`);

  return {
    transcript: transcription.text,
    duration: transcription.duration,
  };
}

// ===========================================
// Dialect Normalization (Austrian → Standard German)
// ===========================================

async function normalizeDialect(transcript: string): Promise<string> {
  if (transcript.length < 10) {
    return transcript;
  }

  const openai = getOpenAI();

  log.info('[Voice] Normalizing dialect...');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildDialectNormalizerPrompt() },
        { role: 'user', content: transcript },
      ],
      max_tokens: 500,
      temperature: 0,
    });

    const normalized = completion.choices[0]?.message?.content?.trim();

    if (normalized && normalized.length > 0) {
      log.info(`[Voice] Normalized: "${normalized}"`);
      return normalized;
    }
  } catch (error) {
    logError('[Voice] Normalization failed:', error);
  }

  return transcript;
}

// ===========================================
// Main Internal Function
// ===========================================

export async function processVoiceMessageInternal(
  input: ProcessVoiceInput
): Promise<VoiceProcessingResult> {
  const { audioBuffer, mimeType = 'audio/ogg' } = input;

  const validation = validateVoiceInput(audioBuffer, mimeType);
  if (!validation.valid) {
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: validation.error,
    };
  }

  log.info(`[Voice] Processing: ${audioBuffer.length} bytes`);

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
    logError('[Voice] Error:', error);
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
