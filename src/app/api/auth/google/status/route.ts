import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { hasGoogleToken } from '@/lib/auth/vault';

/**
 * GET /api/auth/google/status
 * 
 * Check if the current user has connected Google Calendar.
 */
export async function GET() {
  try {
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const connected = await hasGoogleToken(session.userId);

    return NextResponse.json({ connected });

  } catch (error) {
    console.error('[Google OAuth] Status check error:', error);
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
