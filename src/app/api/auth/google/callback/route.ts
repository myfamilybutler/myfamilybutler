import { NextRequest, NextResponse } from 'next/server';
import { completeGoogleOAuth } from '@/lib/sync/google';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { logError } from '@/lib/utils/logger';

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
      logError('[Google OAuth] Callback error:', error);
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

    if (!storedState || storedState !== state) {
      logError('[Google OAuth] State mismatch');
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=invalid_state', request.url)
      );
    }

    // Clear the OAuth state cookie
    cookieStore.delete('google_oauth_state');

    // Derive the user from the Supabase session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logError('[Google OAuth] Missing Supabase session');
      return NextResponse.redirect(
        new URL('/dashboard/settings?google_error=session_expired', request.url)
      );
    }

    // Complete the OAuth flow
    const success = await completeGoogleOAuth(user.id, code);

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
    logError('[Google OAuth] Callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?google_error=internal', request.url)
    );
  }
}
