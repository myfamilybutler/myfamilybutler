import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { getAdminClient } from '@/lib/supabase';
import {
  processVisionMessageInternal,
  validateVisionInput,
} from '@/lib/ai/vision-processor';
import { logError } from '@/lib/utils/logger';

/**
 * POST /api/vision
 *
 * Direct-upload endpoint for vision processing. Accepts a multipart/form-data
 * upload with an `image` field. This avoids buffering/base64-encoding the file
 * through a Server Action boundary.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let session;
  try {
    session = await validateSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: user } = await admin
    .from('users')
    .select('household_id')
    .eq('id', session.userId)
    .maybeSingle();

  if (!user?.household_id) {
    return NextResponse.json(
      { error: 'User is not part of a household' },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing image field' }, { status: 400 });
  }

  const mimeType = file.type || 'image/jpeg';
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'Failed to read image' }, { status: 400 });
  }

  const validation = validateVisionInput(imageBuffer, mimeType);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  try {
    const result = await processVisionMessageInternal({
      imageBuffer,
      mimeType,
      userId: session.userId,
      householdId: user.household_id,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError('[Vision API] Internal error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
