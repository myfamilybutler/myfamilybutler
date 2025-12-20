import { NextRequest, NextResponse } from 'next/server';
import { completeGoogleOAuth } from '@/lib/sync/google';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/google/callback
 * 
 * Handles the OAuth callback from Google.
 * Exchanges the authorization code for tokens and stores them.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('[Google OAuth] Callback error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=denied', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=missing_params', request.url)
      );
    }

    // Verify state token (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    const userId = cookieStore.get('google_oauth_user_id')?.value;

    if (!storedState || storedState !== state) {
      console.error('[Google OAuth] State mismatch');
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=invalid_state', request.url)
      );
    }

    if (!userId) {
      console.error('[Google OAuth] Missing user ID');
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=session_expired', request.url)
      );
    }

    // Clear the OAuth cookies
    cookieStore.delete('google_oauth_state');
    cookieStore.delete('google_oauth_user_id');

    // Complete the OAuth flow
    const success = await completeGoogleOAuth(userId, code);

    if (!success) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=token_exchange_failed', request.url)
      );
    }

    // Success! Redirect back to settings
    return NextResponse.redirect(
      new URL('/dashboard/settings?google_connected=true', request.url)
    );

  } catch (error) {
    console.error('[Google OAuth] Callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?google_error=internal', request.url)
    );
  }
}
