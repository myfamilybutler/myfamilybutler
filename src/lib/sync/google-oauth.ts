/**
 * Google OAuth Flow
 * 
 * Handles OAuth authentication and user profile management.
 */

import { storeGoogleToken, type GoogleToken } from '../auth/vault';
import { getAdminClient } from '../supabase/client';
import { log, logError } from '@/lib/utils/logger';

// ===========================================
// Types
// ===========================================

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// ===========================================
// OAuth Flow
// ===========================================

/**
 * Generate the Google OAuth URL for calendar access
 */
export function getGoogleOAuthUrl(state: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent', // Force consent to ensure we get refresh token
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleToken | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    logError('[GoogleOAuth] Missing Google OAuth credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logError('[GoogleOAuth] Failed to exchange code:', errorData);
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      scope: data.scope,
    };
  } catch (error) {
    logError('[GoogleOAuth] Error exchanging code:', error);
    return null;
  }
}

/**
 * Complete the Google OAuth flow and store tokens
 */
export async function completeGoogleOAuth(
  userId: string,
  code: string
): Promise<boolean> {
  const token = await exchangeCodeForTokens(code);

  if (!token) {
    return false;
  }

  // Store the token securely
  const stored = await storeGoogleToken(userId, token);

  if (!stored) {
    return false;
  }

  // Fetch and update user profile
  await fetchAndUpdateProfile(userId, token.access_token);

  return true;
}

// ===========================================
// User Profile Management
// ===========================================

/**
 * Get Google user info and auto-fill profile if missing
 */
export async function fetchAndUpdateProfile(
  userId: string,
  accessToken: string
): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      logError('[GoogleOAuth] Failed to fetch user info');
      return null;
    }

    const userInfo = await response.json() as GoogleUserInfo;
    log.info(`[GoogleOAuth] Got Google user info for: ${userInfo.email}`);

    // Update the user profile in our database
    await updateProfileFromGoogle(userId, userInfo);

    return userInfo;
  } catch (error) {
    logError('[GoogleOAuth] Error fetching user info:', error);
    return null;
  }
}

/**
 * Update user profile with Google data (only fill missing fields)
 */
async function updateProfileFromGoogle(
  userId: string,
  googleInfo: GoogleUserInfo
): Promise<void> {
  const admin = getAdminClient();

  if (!googleInfo.name) {
    return;
  }

  // Single atomic write: only touch rows where display_name is still NULL.
  // This is equivalent to `SET display_name = COALESCE(display_name, $1)` for
  // this use case and avoids the read-update race where another writer sets
  // display_name between our fetch and update.
  const { error: updateError } = await admin
    .from('users')
    .update({ display_name: googleInfo.name })
    .eq('id', userId)
    .is('display_name', null);

  if (updateError) {
    logError('[GoogleOAuth] Failed to update display_name:', updateError);
    return;
  }

  log.info(`[GoogleOAuth] Ensured display_name for user ${userId}`);
}
