import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { deleteGoogleToken } from '@/lib/auth/vault';

/**
 * POST /api/auth/google/disconnect
 * 
 * Disconnect Google Calendar by removing stored tokens.
 */
export async function POST() {
  try {
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await deleteGoogleToken(session.userId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Google OAuth] Disconnect error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
