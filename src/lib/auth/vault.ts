/**
 * OAuth Token Storage
 * 
 * Securely stores and retrieves OAuth tokens using a database table
 * with Row Level Security (service_role only access).
 */

import { getAdminClient } from '../supabase/client';
import { log, logError } from '@/lib/utils/logger';

// ===========================================
// Types
// ===========================================

export interface GoogleToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number; // Unix timestamp
  scope: string;
}

interface OAuthTokenRow {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
  scope: string;
}

// ===========================================
// Token Storage Operations
// ===========================================

/**
 * Store Google OAuth tokens in the database
 */
export async function storeGoogleToken(
  userId: string,
  token: GoogleToken
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    // Upsert: insert or update if exists
    const { error } = await admin
      .from('user_oauth_tokens')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_at: token.expires_at,
        scope: token.scope,
      }, {
        onConflict: 'user_id,provider',
      });

    if (error) {
      logError('[OAuth] Error storing Google token:', error);
      return false;
    }

    log.info(`[OAuth] Successfully stored Google token for user ${userId}`);
    return true;
  } catch (error) {
    logError('[OAuth] Unexpected error storing token:', error);
    return false;
  }
}

/**
 * Retrieve Google OAuth tokens from the database
 */
export async function getGoogleToken(
  userId: string
): Promise<GoogleToken | null> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from('user_oauth_tokens')
      .select('access_token, refresh_token, token_type, expires_at, scope')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (error) {
      // Not found is not an error
      if (error.code === 'PGRST116') {
        return null;
      }
      logError('[OAuth] Error reading Google token:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const row = data as OAuthTokenRow;
    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      token_type: row.token_type,
      expires_at: row.expires_at,
      scope: row.scope,
    };
  } catch (error) {
    logError('[OAuth] Unexpected error reading token:', error);
    return null;
  }
}

/**
 * Delete Google OAuth tokens from the database
 */
export async function deleteGoogleToken(userId: string): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { error } = await admin
      .from('user_oauth_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      logError('[OAuth] Error deleting Google token:', error);
      return false;
    }

    log.info(`[OAuth] Successfully deleted Google token for user ${userId}`);
    return true;
  } catch (error) {
    logError('[OAuth] Unexpected error deleting token:', error);
    return false;
  }
}

/**
 * Check if a user has a Google token stored
 */
export async function hasGoogleToken(userId: string): Promise<boolean> {
  const token = await getGoogleToken(userId);
  return token !== null;
}

/**
 * Check if the stored token is expired
 */
export function isTokenExpired(token: GoogleToken): boolean {
  // Add a 5-minute buffer before actual expiration
  const bufferSeconds = 300;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return token.expires_at < nowSeconds + bufferSeconds;
}

/**
 * Refresh an expired Google access token using the refresh token
 */
export async function refreshGoogleToken(
  userId: string,
  token: GoogleToken
): Promise<GoogleToken | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logError('[OAuth] Missing Google OAuth credentials');
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
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logError('[OAuth] Failed to refresh Google token:', errorData);
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    const newToken: GoogleToken = {
      access_token: data.access_token,
      refresh_token: token.refresh_token, // Keep the original refresh token
      token_type: data.token_type,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      scope: data.scope,
    };

    // Store the updated token
    await storeGoogleToken(userId, newToken);

    return newToken;
  } catch (error) {
    logError('[OAuth] Error refreshing Google token:', error);
    return null;
  }
}

// ===========================================
// Token Refresh Deduplication
// ===========================================
// Prevents race conditions when multiple requests try to refresh the same token
const refreshInFlight = new Map<string, Promise<GoogleToken | null>>();

/**
 * Get a valid (non-expired) Google access token, refreshing if necessary
 * Deduplicates concurrent refresh requests for the same user
 */
export async function getValidGoogleToken(
  userId: string
): Promise<string | null> {
  let token = await getGoogleToken(userId);

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    log.info(`[OAuth] Token expired for user ${userId}, refreshing...`);
    
    // Check if refresh is already in progress for this user
    const existingRefresh = refreshInFlight.get(userId);
    if (existingRefresh) {
      log.info(`[OAuth] Waiting for existing refresh for user ${userId}`);
      token = await existingRefresh;
    } else {
      // Start new refresh and track it
      const refreshPromise = refreshGoogleToken(userId, token);
      refreshInFlight.set(userId, refreshPromise);
      
      try {
        token = await refreshPromise;
      } finally {
        // Clean up after refresh completes (success or failure)
        refreshInFlight.delete(userId);
      }
    }
    
    if (!token) {
      return null;
    }
  }

  return token.access_token;
}

// ===========================================
// Sync Token Operations (for Google Calendar incremental sync)
// ===========================================

/**
 * Store the Google Calendar sync token for incremental sync
 */
export async function storeSyncToken(
  userId: string,
  syncToken: string
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { error } = await admin
      .from('user_oauth_tokens')
      .update({ 
        sync_token: syncToken,
        last_full_sync_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      logError('[OAuth] Error storing sync token:', error);
      return false;
    }

    return true;
  } catch (error) {
    logError('[OAuth] Unexpected error storing sync token:', error);
    return false;
  }
}

/**
 * Get the Google Calendar sync token for incremental sync
 */
export async function getSyncToken(userId: string): Promise<string | null> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from('user_oauth_tokens')
      .select('sync_token')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (error || !data) {
      return null;
    }

    return (data as { sync_token: string | null }).sync_token;
  } catch (error) {
    logError('[OAuth] Error getting sync token:', error);
    return null;
  }
}

// ===========================================
// Calendar Selection Operations
// ===========================================

export interface CalendarSelection {
  calendarId: string;
  calendarName: string | null;
}

/**
 * Get the selected Google Calendar ID for sync
 * Defaults to 'primary' if not set
 */
export async function getSelectedCalendar(
  userId: string
): Promise<CalendarSelection> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from('user_oauth_tokens')
      .select('calendar_id, calendar_name')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (error || !data) {
      return { calendarId: 'primary', calendarName: null };
    }

    const row = data as { calendar_id: string | null; calendar_name: string | null };
    return {
      calendarId: row.calendar_id || 'primary',
      calendarName: row.calendar_name,
    };
  } catch (error) {
    logError('[OAuth] Error getting selected calendar:', error);
    return { calendarId: 'primary', calendarName: null };
  }
}

/**
 * Set the selected Google Calendar for sync
 * Also clears sync_token to force a fresh sync
 */
export async function setSelectedCalendar(
  userId: string,
  calendarId: string,
  calendarName: string
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { error } = await admin
      .from('user_oauth_tokens')
      .update({
        calendar_id: calendarId,
        calendar_name: calendarName,
        sync_token: null, // Clear sync token to force fresh sync
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) {
      logError('[OAuth] Error setting selected calendar:', error);
      return false;
    }

    log.info(`[OAuth] Set calendar for user ${userId}: ${calendarName} (${calendarId})`);
    return true;
  } catch (error) {
    logError('[OAuth] Unexpected error setting calendar:', error);
    return false;
  }
}

