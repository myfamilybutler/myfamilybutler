import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { getGoogleOAuthUrl } from '@/lib/sync/google';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { logError } from '@/lib/utils/logger';

/**
 * GET /api/auth/google/connect
 *
 * Initiates Google OAuth flow for calendar access.
 * Returns the OAuth URL to redirect the user to.
 */
export async function GET() {
  try {
    // Validate session (user must be logged in via Supabase Auth)
    try {
      await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a state token for CSRF protection
    const state = randomBytes(32).toString('hex');

    // Store state in a secure, httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // The user ID is derived from the Supabase session in the callback,
    // so we do not need to store it in a separate cookie.

    // Generate OAuth URL
    const url = getGoogleOAuthUrl(state);

    return NextResponse.json({ url });
  } catch (error) {
    logError('[Google OAuth] Connect error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
