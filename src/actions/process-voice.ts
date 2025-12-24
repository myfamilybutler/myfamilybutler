'use server';

/**
 * Process Voice Server Action
 * 
 * Handles WhatsApp voice messages by:
 * 1. Downloading the audio from Meta API
 * 2. Transcribing with OpenAI Whisper (Austrian context)
 * 3. Normalizing dialect to standard German
 * 4. Returning clean text for event extraction
 */

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { getWhisperContextPrompt, buildDialectNormalizerPrompt } from '@/lib/ai/prompts';
import type { VoiceProcessingResult } from '@/lib/ai/types';

// ===========================================
// Configuration
// ===========================================

const VOICE_CONFIG = {
  /** Enable dialect normalization step */
  normalizeDialect: true,
  /** Maximum audio duration in seconds (WhatsApp limit is ~16min) */
  maxDurationSeconds: 300,
  /** Whisper model to use */
  whisperModel: 'whisper-1' as const,
  /** Model for dialect normalization */
  normalizerModel: 'gpt-4o-mini' as const,
};

// ===========================================
// OpenAI Client
// ===========================================

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// ===========================================
// Meta API Audio Download
// ===========================================

/**
 * Download audio from WhatsApp Media API
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
 */
async function downloadWhatsAppAudio(mediaId: string): Promise<Buffer> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN environment variable');
  }

  // Step 1: Get the media URL from Meta
  const mediaInfoResponse = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!mediaInfoResponse.ok) {
    const errorData = await mediaInfoResponse.text();
    throw new Error(`Failed to get audio info: ${errorData}`);
  }

  const mediaInfo = await mediaInfoResponse.json() as { url: string };
  
  if (!mediaInfo.url) {
    throw new Error('No URL in media info response');
  }

  // Step 2: Download the actual audio file
  const audioResponse = await fetch(mediaInfo.url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ===========================================
// Whisper Transcription
// ===========================================

/**
 * Transcribe audio using OpenAI Whisper
 * Includes Austrian German context prompt for better accuracy
 */
async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg'
): Promise<{ transcript: string; duration?: number }> {
  const openai = getOpenAI();
  
  // Determine file extension from MIME type
  const extensionMap: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };
  const extension = extensionMap[mimeType] || 'ogg';
  
  // Convert buffer to file for OpenAI API
  const file = await toFile(audioBuffer, `voice.${extension}`, { type: mimeType });
  
  // Get Austrian-specific context prompt
  const contextPrompt = getWhisperContextPrompt();
  
  console.log('[VoiceAgent] Transcribing audio with Whisper...');
  
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: VOICE_CONFIG.whisperModel,
    language: 'de', // Force German language
    prompt: contextPrompt, // Austrian context bias
    response_format: 'verbose_json', // Get duration info
  });
  
  console.log(`[VoiceAgent] Whisper transcription: "${transcription.text}"`);
  
  return {
    transcript: transcription.text,
    duration: transcription.duration,
  };
}

// ===========================================
// Dialect Normalization
// ===========================================

/**
 * Normalize Austrian dialect to standard German
 * Uses a cheap GPT-4o-mini call for linguistic conversion
 */
async function normalizeDialect(transcript: string): Promise<string> {
  if (!VOICE_CONFIG.normalizeDialect) {
    return transcript;
  }
  
  // Skip normalization for very short or already standard text
  if (transcript.length < 10) {
    return transcript;
  }
  
  const openai = getOpenAI();
  const systemPrompt = buildDialectNormalizerPrompt();
  
  console.log('[VoiceAgent] Normalizing dialect...');
  
  try {
    const completion = await openai.chat.completions.create({
      model: VOICE_CONFIG.normalizerModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      max_tokens: 500,
      temperature: 0, // Deterministic output
    });
    
    const normalized = completion.choices[0]?.message?.content?.trim();
    
    if (normalized && normalized.length > 0) {
      console.log(`[VoiceAgent] Normalized: "${normalized}"`);
      return normalized;
    }
    
    return transcript;
  } catch (error) {
    console.error('[VoiceAgent] Dialect normalization failed:', error);
    // Fall back to raw transcript if normalization fails
    return transcript;
  }
}

// ===========================================
// Main Processing Function
// ===========================================

/**
 * Process a WhatsApp voice message
 * Downloads, transcribes, and normalizes the audio
 */
export async function processVoiceMessage(input: {
  mediaId: string;
  mimeType?: string;
}): Promise<VoiceProcessingResult> {
  const { mediaId, mimeType = 'audio/ogg' } = input;
  
  console.log(`[VoiceAgent] Processing voice message: ${mediaId}`);
  
  try {
    // Step 1: Download audio from WhatsApp
    const audioBuffer = await downloadWhatsAppAudio(mediaId);
    console.log(`[VoiceAgent] Downloaded audio: ${audioBuffer.length} bytes`);
    
    // Step 2: Transcribe with Whisper
    const { transcript, duration } = await transcribeAudio(audioBuffer, mimeType);
    
    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        transcript: '',
        normalizedText: '',
        error: 'No speech detected in audio',
      };
    }
    
    // Step 3: Normalize dialect (Austrian → Standard German)
    const normalizedText = await normalizeDialect(transcript);
    
    console.log(`[VoiceAgent] Processing complete`);
    console.log(`[VoiceAgent] Original: "${transcript}"`);
    console.log(`[VoiceAgent] Normalized: "${normalizedText}"`);
    
    return {
      success: true,
      transcript,
      normalizedText,
      durationSeconds: duration,
    };
    
  } catch (error) {
    console.error('[VoiceAgent] Processing error:', error);
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a local audio buffer (for testing without WhatsApp)
 */
export async function processLocalAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg'
): Promise<VoiceProcessingResult> {
  console.log(`[VoiceAgent] Processing local audio: ${audioBuffer.length} bytes`);
  
  try {
    const { transcript, duration } = await transcribeAudio(audioBuffer, mimeType);
    
    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        transcript: '',
        normalizedText: '',
        error: 'No speech detected in audio',
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
    console.error('[VoiceAgent] Local processing error:', error);
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
