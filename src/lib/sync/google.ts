/**
 * Google Calendar Sync
 * 
 * Handles syncing events to Google Calendar API.
 */

import { getValidGoogleToken, storeGoogleToken, type GoogleToken } from '../auth/vault';
import { getAdminClient } from '../supabase/client';
import type { Event } from '@/types';

// ===========================================
// Types
// ===========================================

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone: string;
  };
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// ===========================================
// Google Calendar API
// ===========================================

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TIMEZONE = 'Europe/Vienna';

/**
 * Sync an event to Google Calendar
 */
export async function syncEventToGoogle(
  userId: string,
  event: Event
): Promise<string | null> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    console.log(`[GoogleSync] No valid token for user ${userId}, skipping sync`);
    return null;
  }

  try {
    const googleEvent = convertToGoogleEvent(event);

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GoogleSync] Failed to create event:', errorData);
      return null;
    }

    const createdEvent = await response.json() as { id: string };
    console.log(`[GoogleSync] Created Google Calendar event: ${createdEvent.id}`);

    // Store the Google Calendar event ID in our database for future updates
    await storeGoogleEventId(event.id, createdEvent.id);

    return createdEvent.id;
  } catch (error) {
    console.error('[GoogleSync] Error syncing event:', error);
    return null;
  }
}

/**
 * Update an existing event in Google Calendar
 */
export async function updateGoogleEvent(
  userId: string,
  event: Event,
  googleEventId: string
): Promise<boolean> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    return false;
  }

  try {
    const googleEvent = convertToGoogleEvent(event);

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GoogleSync] Failed to update event:', errorData);
      return false;
    }

    console.log(`[GoogleSync] Updated Google Calendar event: ${googleEventId}`);
    return true;
  } catch (error) {
    console.error('[GoogleSync] Error updating event:', error);
    return false;
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleEvent(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    return false;
  }

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.text();
      console.error('[GoogleSync] Failed to delete event:', errorData);
      return false;
    }

    console.log(`[GoogleSync] Deleted Google Calendar event: ${googleEventId}`);
    return true;
  } catch (error) {
    console.error('[GoogleSync] Error deleting event:', error);
    return false;
  }
}

/**
 * Fetch events from Google Calendar within a date range
 */
export async function fetchGoogleEvents(
  userId: string,
  timeMin: string,  // ISO date string (e.g., '2024-12-01T00:00:00Z')
  timeMax: string   // ISO date string (e.g., '2024-12-31T23:59:59Z')
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    console.log(`[GoogleSync] No valid token for user ${userId}, cannot fetch events`);
    return [];
  }

  try {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',  // Expand recurring events
      orderBy: 'startTime',
      maxResults: '250',
    });

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GoogleSync] Failed to fetch events:', errorData);
      return [];
    }

    const data = await response.json() as {
      items?: Array<{
        id: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { dateTime?: string; date?: string; timeZone?: string };
        end?: { dateTime?: string; date?: string; timeZone?: string };
      }>;
    };

    const events: GoogleCalendarEvent[] = (data.items || []).map((item) => ({
      id: item.id,
      summary: item.summary || 'Untitled Event',
      description: item.description,
      location: item.location,
      start: {
        dateTime: item.start?.dateTime,
        date: item.start?.date,
        timeZone: item.start?.timeZone || TIMEZONE,
      },
      end: {
        dateTime: item.end?.dateTime,
        date: item.end?.date,
        timeZone: item.end?.timeZone || TIMEZONE,
      },
    }));

    console.log(`[GoogleSync] Fetched ${events.length} events from Google Calendar`);
    return events;
  } catch (error) {
    console.error('[GoogleSync] Error fetching events:', error);
    return [];
  }
}

/**
 * Incremental sync result
 */
export interface IncrementalSyncResult {
  events: GoogleCalendarEventWithStatus[];
  nextSyncToken: string | null;
  isFullSync: boolean;
}

export interface GoogleCalendarEventWithStatus extends GoogleCalendarEvent {
  status?: 'confirmed' | 'cancelled' | 'tentative';
}

/**
 * Fetch events from Google Calendar using incremental sync.
 * Uses syncToken to only get changes since last sync.
 * 
 * @param userId - The user ID
 * @param syncToken - The sync token from previous sync (null for full sync)
 * @returns Events changed since last sync + new syncToken
 */
export async function fetchGoogleEventsIncremental(
  userId: string,
  syncToken: string | null
): Promise<IncrementalSyncResult> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    console.log(`[GoogleSync] No valid token for user ${userId}`);
    return { events: [], nextSyncToken: null, isFullSync: false };
  }

  try {
    const params = new URLSearchParams({
      maxResults: '250',
      showDeleted: 'true',  // Include deleted events for sync
    });

    // If we have a sync token, use it for incremental sync
    // Otherwise, do a full sync with a date range
    if (syncToken) {
      params.set('syncToken', syncToken);
    } else {
      // Full sync: get events from 1 year ago to 1 year ahead
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      params.set('timeMin', oneYearAgo.toISOString());
      params.set('timeMax', oneYearAhead.toISOString());
      params.set('singleEvents', 'true');
      params.set('orderBy', 'startTime');
    }

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Handle 410 Gone - syncToken expired, need full sync
    if (response.status === 410) {
      console.log(`[GoogleSync] Sync token expired for user ${userId}, performing full sync`);
      return fetchGoogleEventsIncremental(userId, null);
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GoogleSync] Failed to fetch events:', errorData);
      return { events: [], nextSyncToken: syncToken, isFullSync: false };
    }

    const data = await response.json() as {
      items?: Array<{
        id: string;
        status?: 'confirmed' | 'cancelled' | 'tentative';
        summary?: string;
        description?: string;
        location?: string;
        start?: { dateTime?: string; date?: string; timeZone?: string };
        end?: { dateTime?: string; date?: string; timeZone?: string };
      }>;
      nextSyncToken?: string;
      nextPageToken?: string;
    };

    const events: GoogleCalendarEventWithStatus[] = (data.items || []).map((item) => ({
      id: item.id,
      status: item.status,
      summary: item.summary || 'Untitled Event',
      description: item.description,
      location: item.location,
      start: {
        dateTime: item.start?.dateTime,
        date: item.start?.date,
        timeZone: item.start?.timeZone || TIMEZONE,
      },
      end: {
        dateTime: item.end?.dateTime,
        date: item.end?.date,
        timeZone: item.end?.timeZone || TIMEZONE,
      },
    }));

    console.log(`[GoogleSync] Incremental sync: ${events.length} events (fullSync: ${!syncToken})`);
    
    return {
      events,
      nextSyncToken: data.nextSyncToken || null,
      isFullSync: !syncToken,
    };
  } catch (error) {
    console.error('[GoogleSync] Error in incremental sync:', error);
    return { events: [], nextSyncToken: syncToken, isFullSync: false };
  }
}

// ===========================================
// Google User Profile
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
      console.error('[GoogleSync] Failed to fetch user info');
      return null;
    }

    const userInfo = await response.json() as GoogleUserInfo;
    console.log(`[GoogleSync] Got Google user info for: ${userInfo.email}`);

    // Update the user profile in our database
    await updateProfileFromGoogle(userId, userInfo);

    return userInfo;
  } catch (error) {
    console.error('[GoogleSync] Error fetching user info:', error);
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

  // Get current user data
  const { data: user, error: fetchError } = await admin
    .from('users')
    .select('display_name, phone_number')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    console.error('[GoogleSync] Failed to fetch user for profile update');
    return;
  }

  // Only update if display_name is missing
  if (!user.display_name && googleInfo.name) {
    const { error: updateError } = await admin
      .from('users')
      .update({ display_name: googleInfo.name })
      .eq('id', userId);

    if (updateError) {
      console.error('[GoogleSync] Failed to update display_name:', updateError);
    } else {
      console.log(`[GoogleSync] Updated display_name for user ${userId}`);
    }
  }
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Convert our Event format to Google Calendar Event format
 */
function convertToGoogleEvent(event: Event): GoogleCalendarEvent {
  const googleEvent: GoogleCalendarEvent = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: { timeZone: TIMEZONE },
    end: { timeZone: TIMEZONE },
  };

  if (event.is_all_day || !event.event_time) {
    // All-day event
    googleEvent.start.date = event.event_date;
    googleEvent.end.date = event.event_date;
  } else {
    // Timed event
    const startDateTime = `${event.event_date}T${event.event_time}:00`;
    googleEvent.start.dateTime = startDateTime;

    if (event.end_time) {
      const endDateTime = `${event.event_date}T${event.end_time}:00`;
      googleEvent.end.dateTime = endDateTime;
    } else {
      // Default 1 hour duration
      const startDate = new Date(`${event.event_date}T${event.event_time}`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      googleEvent.end.dateTime = endDate.toISOString().slice(0, 19);
    }
  }

  return googleEvent;
}

/**
 * Store Google Calendar event ID mapping in our database
 */
async function storeGoogleEventId(
  eventId: string,
  googleEventId: string
): Promise<void> {
  const admin = getAdminClient();

  // Check if events table has google_event_id column
  // If not, this operation will fail silently
  const { error } = await admin
    .from('events')
    .update({ google_event_id: googleEventId } as Record<string, unknown>)
    .eq('id', eventId);

  if (error) {
    // Column might not exist yet - that's okay
    console.log('[GoogleSync] Could not store Google event ID (column may not exist)');
  }
}

// ===========================================
// OAuth Flow Helpers
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
    console.error('[GoogleSync] Missing Google OAuth credentials');
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
      console.error('[GoogleSync] Failed to exchange code:', errorData);
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
    console.error('[GoogleSync] Error exchanging code:', error);
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
