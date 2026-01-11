import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { getGoogleOAuthUrl } from '@/lib/sync/google';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/google/connect
 * 
 * Initiates Google OAuth flow for calendar access.
 * Returns the OAuth URL to redirect the user to.
 */
export async function GET() {
  try {
    // Validate session
    let session;
    try {
      session = await validateSession();
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

    // Also store the user ID for the callback
    cookieStore.set('google_oauth_user_id', session.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    // Generate OAuth URL
    const url = getGoogleOAuthUrl(state);
    
    return NextResponse.json({ url });

  } catch (error) {
    console.error('[Google OAuth] Connect error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
