/**
 * Google Calendar API
 * 
 * Handles all Calendar API interactions: CRUD operations and fetching.
 */

import { getValidGoogleToken, getSelectedCalendar } from '../auth/vault';
import { getAdminClient } from '../supabase/client';
import type { Event } from '@/types';

// ===========================================
// Constants
// ===========================================

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TIMEZONE = 'Europe/Vienna';

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

export interface IncrementalSyncResult {
  events: GoogleCalendarEventWithStatus[];
  nextSyncToken: string | null;
  isFullSync: boolean;
}

export interface GoogleCalendarEventWithStatus extends GoogleCalendarEvent {
  status?: 'confirmed' | 'cancelled' | 'tentative';
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Build the calendar events URL using user's selected calendar
 */
function getCalendarEventsUrl(calendarId: string, eventId?: string): string {
  const encodedCalendarId = encodeURIComponent(calendarId);
  const baseUrl = `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendarId}/events`;
  return eventId ? `${baseUrl}/${eventId}` : baseUrl;
}

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

  const { error } = await admin
    .from('events')
    .update({ google_event_id: googleEventId } as Record<string, unknown>)
    .eq('id', eventId);

  if (error) {
    console.log('[GoogleCalendar] Could not store Google event ID (column may not exist)');
  }
}

// ===========================================
// Create / Update / Delete Operations
// ===========================================

/**
 * Sync an event to Google Calendar (create)
 */
export async function syncEventToGoogle(
  userId: string,
  event: Event
): Promise<string | null> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    console.log(`[GoogleCalendar] No valid token for user ${userId}, skipping sync`);
    return null;
  }

  try {
    const { calendarId } = await getSelectedCalendar(userId);
    const googleEvent = convertToGoogleEvent(event);

    const response = await fetch(
      getCalendarEventsUrl(calendarId),
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
      console.error('[GoogleCalendar] Failed to create event:', errorData);
      return null;
    }

    const createdEvent = await response.json() as { id: string };
    console.log(`[GoogleCalendar] Created event: ${createdEvent.id}`);

    await storeGoogleEventId(event.id, createdEvent.id);

    return createdEvent.id;
  } catch (error) {
    console.error('[GoogleCalendar] Error syncing event:', error);
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
    const { calendarId } = await getSelectedCalendar(userId);
    const googleEvent = convertToGoogleEvent(event);

    const response = await fetch(
      getCalendarEventsUrl(calendarId, googleEventId),
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
      console.error('[GoogleCalendar] Failed to update event:', errorData);
      return false;
    }

    console.log(`[GoogleCalendar] Updated event: ${googleEventId}`);
    return true;
  } catch (error) {
    console.error('[GoogleCalendar] Error updating event:', error);
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
    const { calendarId } = await getSelectedCalendar(userId);
    const response = await fetch(
      getCalendarEventsUrl(calendarId, googleEventId),
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.text();
      console.error('[GoogleCalendar] Failed to delete event:', errorData);
      return false;
    }

    console.log(`[GoogleCalendar] Deleted event: ${googleEventId}`);
    return true;
  } catch (error) {
    console.error('[GoogleCalendar] Error deleting event:', error);
    return false;
  }
}

// ===========================================
// Fetch Operations
// ===========================================

/**
 * Fetch events from Google Calendar within a date range
 */
export async function fetchGoogleEvents(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    console.log(`[GoogleCalendar] No valid token for user ${userId}, cannot fetch events`);
    return [];
  }

  try {
    const { calendarId } = await getSelectedCalendar(userId);
    let allEvents: GoogleCalendarEvent[] = [];
    let pageToken: string | undefined = undefined;
    
    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      });
      
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(
        `${getCalendarEventsUrl(calendarId)}?${params}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[GoogleCalendar] Failed to fetch events:', errorData);
        // If we have partial data, maybe return it? Or just throw.
        // For now, let's break and return what we have (or empty if first page failed)
        if (allEvents.length > 0) break;
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
        nextPageToken?: string;
      };

      const pageEvents: GoogleCalendarEvent[] = (data.items || []).map((item) => ({
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

      allEvents = [...allEvents, ...pageEvents];
      pageToken = data.nextPageToken;

    } while (pageToken);

    console.log(`[GoogleCalendar] Fetched ${allEvents.length} events (total)`);
    return allEvents;
  } catch (error) {
    console.error('[GoogleCalendar] Error fetching events:', error);
    return [];
  }
}

/**
 * Fetch events from Google Calendar using incremental sync.
 * Uses syncToken to only get changes since last sync.
 */
export async function fetchGoogleEventsIncremental(
  userId: string,
  syncToken: string | null
): Promise<IncrementalSyncResult> {
  const accessToken = await getValidGoogleToken(userId);

  if (!accessToken) {
    console.log(`[GoogleCalendar] No valid token for user ${userId}`);
    return { events: [], nextSyncToken: null, isFullSync: false };
  }

  try {
    const { calendarId } = await getSelectedCalendar(userId);
    const params = new URLSearchParams({
      maxResults: '250',
      showDeleted: 'true',
    });

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
      `${getCalendarEventsUrl(calendarId)}?${params}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Handle 410 Gone - syncToken expired, need full sync
    if (response.status === 410) {
      console.log(`[GoogleCalendar] Sync token expired for user ${userId}, performing full sync`);
      return fetchGoogleEventsIncremental(userId, null);
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[GoogleCalendar] Failed to fetch events:', errorData);
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

    console.log(`[GoogleCalendar] Incremental sync: ${events.length} events (fullSync: ${!syncToken})`);
    
    return {
      events,
      nextSyncToken: data.nextSyncToken || null,
      isFullSync: !syncToken,
    };
  } catch (error) {
    console.error('[GoogleCalendar] Error in incremental sync:', error);
    return { events: [], nextSyncToken: syncToken, isFullSync: false };
  }
}
