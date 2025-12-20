/**
 * Supabase Vault - Secure Token Storage
 * 
 * Uses Supabase Vault RPC functions to securely store and retrieve
 * sensitive tokens like Google OAuth refresh tokens.
 * 
 * @see https://supabase.com/docs/guides/database/vault
 */

import { getAdminClient } from '../supabase/client';

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

// ===========================================
// Vault Operations
// ===========================================

/**
 * Store Google OAuth tokens securely in Supabase Vault
 */
export async function storeGoogleToken(
  userId: string,
  token: GoogleToken
): Promise<boolean> {
  const admin = getAdminClient();
  const secretName = `google_token_${userId}`;
  const secretValue = JSON.stringify(token);

  try {
    // Check if secret already exists
    const existing = await getGoogleToken(userId);
    
    if (existing) {
      // Update existing secret using vault.update_secret
      const { error } = await admin.rpc('vault_update_secret', {
        secret_name: secretName,
        new_secret: secretValue,
      });

      if (error) {
        console.error('[Vault] Error updating Google token:', error);
        return false;
      }
    } else {
      // Create new secret using vault.create_secret
      const { error } = await admin.rpc('vault_create_secret', {
        secret_name: secretName,
        secret_value: secretValue,
      });

      if (error) {
        console.error('[Vault] Error storing Google token:', error);
        return false;
      }
    }

    console.log(`[Vault] Successfully stored Google token for user ${userId}`);
    return true;
  } catch (error) {
    console.error('[Vault] Unexpected error storing token:', error);
    return false;
  }
}

/**
 * Retrieve Google OAuth tokens from Supabase Vault
 */
export async function getGoogleToken(
  userId: string
): Promise<GoogleToken | null> {
  const admin = getAdminClient();
  const secretName = `google_token_${userId}`;

  try {
    const { data, error } = await admin.rpc('vault_read_secret', {
      secret_name: secretName,
    });

    if (error) {
      // Secret not found is not an error condition
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        return null;
      }
      console.error('[Vault] Error reading Google token:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Parse the stored JSON token
    const token = JSON.parse(data as string) as GoogleToken;
    return token;
  } catch (error) {
    console.error('[Vault] Unexpected error reading token:', error);
    return null;
  }
}

/**
 * Delete Google OAuth tokens from Supabase Vault
 */
export async function deleteGoogleToken(userId: string): Promise<boolean> {
  const admin = getAdminClient();
  const secretName = `google_token_${userId}`;

  try {
    const { error } = await admin.rpc('vault_delete_secret', {
      secret_name: secretName,
    });

    if (error) {
      console.error('[Vault] Error deleting Google token:', error);
      return false;
    }

    console.log(`[Vault] Successfully deleted Google token for user ${userId}`);
    return true;
  } catch (error) {
    console.error('[Vault] Unexpected error deleting token:', error);
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
    console.error('[Vault] Missing Google OAuth credentials');
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
      console.error('[Vault] Failed to refresh Google token:', errorData);
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
    console.error('[Vault] Error refreshing Google token:', error);
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
    console.log(`[Vault] Token expired for user ${userId}, refreshing...`);
    
    // Check if refresh is already in progress for this user
    const existingRefresh = refreshInFlight.get(userId);
    if (existingRefresh) {
      console.log(`[Vault] Waiting for existing refresh for user ${userId}`);
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
