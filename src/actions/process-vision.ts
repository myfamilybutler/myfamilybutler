'use server';

/**
 * Process Vision Server Action
 *
 * Authenticated wrapper around the internal vision processor.
 * Accepts a FormData upload (field name: `image`) so the file is streamed
 * through the action boundary instead of being base64-encoded as a Buffer.
 */

import { validateSession } from '@/lib/auth/helpers';
import { getAdminClient } from '@/lib/supabase';
import {
  processVisionMessageInternal,
  validateVisionInput,
  type ProcessVisionResult,
} from '@/lib/ai/vision-processor';
import { logError } from '@/lib/utils/logger';

export type { ProcessVisionResult };

export async function processVisionMessage(formData: FormData): Promise<ProcessVisionResult> {
  const file = formData.get('image');
  if (!(file instanceof Blob)) {
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: 'Missing image field',
    };
  }

  const mimeType = file.type || 'image/jpeg';
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: 'Failed to read image',
    };
  }

  const validation = validateVisionInput(imageBuffer, mimeType);
  if (!validation.valid) {
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: validation.error,
    };
  }

  let session;
  try {
    session = await validateSession();
  } catch {
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: 'Unauthorized',
    };
  }

  // Resolve the user's household server-side; do not trust client input.
  const admin = getAdminClient();
  const { data: user } = await admin
    .from('users')
    .select('household_id')
    .eq('id', session.userId)
    .maybeSingle();

  if (!user?.household_id) {
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: 'User is not part of a household',
    };
  }

  try {
    return await processVisionMessageInternal({
      imageBuffer,
      mimeType,
      userId: session.userId,
      householdId: user.household_id,
    });
  } catch (error) {
    logError('[Vision Action] Internal error:', error);
    return {
      success: false,
      events: [],
      eventsCreated: 0,
      documentType: 'other',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
