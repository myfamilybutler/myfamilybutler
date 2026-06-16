'use server';

/**
 * Process Voice Server Action
 *
 * Authenticated wrapper around the internal voice processor.
 */

import { validateSession } from '@/lib/auth/helpers';
import {
  processVoiceMessageInternal,
  validateVoiceInput,
  type ProcessVoiceInput,
  type VoiceProcessingResult,
} from '@/lib/ai/voice-processor';
import { logError } from '@/lib/utils/logger';

export type { ProcessVoiceInput, VoiceProcessingResult };

export async function processVoiceMessage(
  input: ProcessVoiceInput
): Promise<VoiceProcessingResult> {
  // Validate input size/type early.
  const validation = validateVoiceInput(input.audioBuffer, input.mimeType);
  if (!validation.valid) {
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: validation.error,
    };
  }

  try {
    await validateSession();
  } catch {
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: 'Unauthorized',
    };
  }

  try {
    return await processVoiceMessageInternal(input);
  } catch (error) {
    logError('[Voice Action] Internal error:', error);
    return {
      success: false,
      transcript: '',
      normalizedText: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
