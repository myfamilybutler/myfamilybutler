/**
 * Google Calendar Sync Service
 * 
 * Handles bidirectional sync between My Family Butler and Google Calendar.
 * - Push: When events are created/updated/deleted in our app → sync to Google
 * - Pull: When dashboard loads → fetch changes from Google using syncToken
 */

import { getAdminClient } from '../supabase/client';
import { getSyncToken, storeSyncToken, hasGoogleToken } from '../auth/vault';
import { 
  fetchGoogleEventsIncremental, 
  syncEventToGoogle, 
  updateGoogleEvent, 
  deleteGoogleEvent,
  type GoogleCalendarEventWithStatus 
} from './google';
import { generateEventFingerprint, fingerprintFromGoogleEvent } from './event-fingerprint';
import type { Event } from '@/types';

// ===========================================
// Types
// ===========================================

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  linked: number;  // Existing events linked to Google via fingerprint
  errors: string[];
}

export interface PushResult {
  success: boolean;
  googleEventId?: string;
  error?: string;
}

// ===========================================
// Pull Sync: Google → Our App
// ===========================================

// Sync lock: Prevents concurrent syncs for the same user
// If a sync is already in progress, return the same promise
const syncInFlight = new Map<string, Promise<SyncResult>>();

/**
 * Pull events from Google Calendar and merge with local events.
 * Uses incremental sync (syncToken) to only fetch changes.
 * 
 * OPTIMIZED: Uses batch queries instead of per-event queries to avoid N+1.
 * THREAD-SAFE: Deduplicates concurrent sync requests for same user.
 * 
 * Called when dashboard loads.
 */
export async function pullFromGoogle(
  userId: string,
  householdId: string
): Promise<SyncResult> {
  // Check if sync already in progress for this user
  const existingSync = syncInFlight.get(userId);
  if (existingSync) {
    console.log(`[Sync] Sync already in progress for user ${userId}, waiting...`);
    return existingSync;
  }

  // Start new sync and track it
  const syncPromise = performPullFromGoogle(userId, householdId);
  syncInFlight.set(userId, syncPromise);

  try {
    return await syncPromise;
  } finally {
    // Clean up after sync completes
    syncInFlight.delete(userId);
  }
}

/**
 * Internal: Actual sync logic
 */
async function performPullFromGoogle(
  userId: string,
  householdId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    created: 0,
    updated: 0,
    deleted: 0,
    linked: 0,
    errors: [],
  };

  // Check if user has Google Calendar connected
  if (!await hasGoogleToken(userId)) {
    return { ...result, success: true }; // No Google token = nothing to sync
  }

  const admin = getAdminClient();

  try {
    // Get stored sync token
    const syncToken = await getSyncToken(userId);
    
    // Fetch events from Google (incremental if we have a token)
    const syncResult = await fetchGoogleEventsIncremental(userId, syncToken);
    
    if (syncResult.events.length === 0 && syncResult.nextSyncToken) {
      // No changes since last sync
      console.log('[Sync] No changes from Google Calendar');
      // Still store the new token
      if (syncResult.nextSyncToken !== syncToken) {
        await storeSyncToken(userId, syncResult.nextSyncToken);
      }
      return { ...result, success: true };
    }

    // =============================================
    // BATCH OPTIMIZATION: Pre-fetch all related data in 2 queries
    // =============================================
    
    // Extract all Google event IDs and generate all fingerprints upfront
    const googleEventIds = syncResult.events
      .filter(e => e.id)
      .map(e => e.id);
    
    const fingerprints = syncResult.events
      .filter(e => e.status !== 'cancelled')
      .map(e => fingerprintFromGoogleEvent(e));

    // Query 1: Get all events already linked to these Google IDs
    const { data: linkedEvents } = await admin
      .from('events')
      .select('id, google_event_id, title, event_date, event_time')
      .in('google_event_id', googleEventIds.length > 0 ? googleEventIds : ['__none__']);
    
    // Query 2: Get all events matching these fingerprints (for dedup linking)
    const { data: fingerprintMatches } = await admin
      .from('events')
      .select('id, event_fingerprint, google_event_id')
      .eq('household_id', householdId)
      .is('google_event_id', null)  // Only unlinked events
      .in('event_fingerprint', fingerprints.length > 0 ? fingerprints : ['__none__']);

    // Type for lookup maps
    type LinkedEvent = { id: string; google_event_id: string; title: string; event_date: string; event_time: string | null };
    type FingerprintMatch = { id: string; event_fingerprint: string; google_event_id: string | null };

    // Build lookup maps for O(1) access
    const linkedByGoogleId = new Map<string, LinkedEvent>(
      ((linkedEvents || []) as LinkedEvent[]).map(e => [e.google_event_id, e])
    );
    const unlinkedByFingerprint = new Map<string, FingerprintMatch>(
      ((fingerprintMatches || []) as FingerprintMatch[]).map(e => [e.event_fingerprint, e])
    );

    // =============================================
    // Process events using pre-fetched data (no more per-event queries)
    // =============================================
    
    const toInsert: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: string; data: Record<string, unknown> }> = [];
    const toDelete: string[] = [];
    const toLink: Array<{ id: string; googleEventId: string }> = [];

    for (const googleEvent of syncResult.events) {
      try {
        // Skip events without an ID
        if (!googleEvent.id) {
          continue;
        }

        const fingerprint = fingerprintFromGoogleEvent(googleEvent);

        // Handle deleted events
        if (googleEvent.status === 'cancelled') {
          const linked = linkedByGoogleId.get(googleEvent.id);
          if (linked) {
            toDelete.push(linked.id);
            result.deleted++;
          }
          continue;
        }

        // Check if already linked
        const existing = linkedByGoogleId.get(googleEvent.id);
        if (existing) {
          const updates = convertGoogleToLocalEvent(googleEvent);
          toUpdate.push({ id: existing.id, data: updates });
          result.updated++;
          continue;
        }

        // Check for fingerprint match (dedup linking)
        const duplicate = unlinkedByFingerprint.get(fingerprint);
        if (duplicate) {
          toLink.push({ id: duplicate.id, googleEventId: googleEvent.id });
          // Mark as linked to prevent double-linking
          unlinkedByFingerprint.delete(fingerprint);
          result.linked++;
          continue;
        }

        // New event to create
        const newEvent = convertGoogleToLocalEvent(googleEvent);
        toInsert.push({
          ...newEvent,
          household_id: householdId,
          created_by: userId,
          google_event_id: googleEvent.id,
          event_fingerprint: fingerprint,
          sync_source: 'google',
          google_synced_at: new Date().toISOString(),
        });
        result.created++;
        
      } catch (error) {
        result.errors.push(`Failed to process event ${googleEvent.id}: ${error}`);
      }
    }

    // =============================================
    // Execute batch operations (max 3 queries for all events)
    // =============================================
    
    // Batch delete
    if (toDelete.length > 0) {
      await admin.from('events').delete().in('id', toDelete);
      console.log(`[Sync] Batch deleted ${toDelete.length} events`);
    }

    // Batch update (individual updates, but minimal)
    for (const { id, data } of toUpdate) {
      await admin.from('events').update(data).eq('id', id);
    }

    // Batch link
    for (const { id, googleEventId } of toLink) {
      await admin
        .from('events')
        .update({ 
          google_event_id: googleEventId,
          google_synced_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    // Batch insert
    if (toInsert.length > 0) {
      await admin.from('events').insert(toInsert);
      console.log(`[Sync] Batch inserted ${toInsert.length} events`);
    }

    // Store new sync token for next time
    if (syncResult.nextSyncToken) {
      await storeSyncToken(userId, syncResult.nextSyncToken);
    }

    result.success = true;
    console.log(`[Sync] Pull complete: +${result.created} ~${result.updated} -${result.deleted} 🔗${result.linked}`);
    
  } catch (error) {
    console.error('[Sync] Pull from Google failed:', error);
    result.errors.push(`Sync failed: ${error}`);
  }

  return result;
}

/**
 * Convert Google Calendar event to our local Event format
 */
function convertGoogleToLocalEvent(googleEvent: GoogleCalendarEventWithStatus): Partial<Event> {
  // Extract date and time
  let eventDate: string;
  let eventTime: string | null = null;
  let endTime: string | null = null;
  let isAllDay = false;

  if (googleEvent.start.dateTime) {
    // Timed event
    const [datePart, timePart] = googleEvent.start.dateTime.split('T');
    eventDate = datePart;
    eventTime = timePart?.slice(0, 5) || null;
    
    if (googleEvent.end.dateTime) {
      endTime = googleEvent.end.dateTime.split('T')[1]?.slice(0, 5) || null;
    }
  } else if (googleEvent.start.date) {
    // All-day event
    eventDate = googleEvent.start.date;
    isAllDay = true;
  } else {
    eventDate = new Date().toISOString().split('T')[0];
  }

  return {
    title: googleEvent.summary,
    description: googleEvent.description || undefined,
    location: googleEvent.location || undefined,
    event_date: eventDate,
    event_time: eventTime || undefined,
    end_time: endTime || undefined,
    is_all_day: isAllDay,
  };
}

// ===========================================
// Push Sync: Our App → Google
// ===========================================

/**
 * Push a newly created event to Google Calendar
 */
export async function pushCreateToGoogle(
  userId: string,
  event: Event
): Promise<PushResult> {
  if (!await hasGoogleToken(userId)) {
    return { success: true }; // No Google token = skip sync
  }

  // Check if already synced
  if (event.google_event_id) {
    return { success: true, googleEventId: event.google_event_id };
  }

  const googleEventId = await syncEventToGoogle(userId, event);
  
  if (googleEventId) {
    // Store the Google event ID
    const admin = getAdminClient();
    await admin
      .from('events')
      .update({ 
        google_event_id: googleEventId,
        google_synced_at: new Date().toISOString(),
      })
      .eq('id', event.id);
    
    return { success: true, googleEventId };
  }

  return { success: false, error: 'Failed to create in Google Calendar' };
}

/**
 * Push an updated event to Google Calendar
 */
export async function pushUpdateToGoogle(
  userId: string,
  event: Event
): Promise<PushResult> {
  if (!await hasGoogleToken(userId)) {
    return { success: true };
  }

  if (!event.google_event_id) {
    // Not synced yet, create it
    return pushCreateToGoogle(userId, event);
  }

  const success = await updateGoogleEvent(userId, event, event.google_event_id);
  
  if (success) {
    const admin = getAdminClient();
    await admin
      .from('events')
      .update({ google_synced_at: new Date().toISOString() })
      .eq('id', event.id);
  }

  return { 
    success,
    googleEventId: event.google_event_id,
    error: success ? undefined : 'Failed to update in Google Calendar',
  };
}

/**
 * Push a deleted event to Google Calendar
 */
export async function pushDeleteToGoogle(
  userId: string,
  googleEventId: string | null
): Promise<PushResult> {
  if (!await hasGoogleToken(userId) || !googleEventId) {
    return { success: true };
  }

  const success = await deleteGoogleEvent(userId, googleEventId);
  
  return { 
    success,
    error: success ? undefined : 'Failed to delete from Google Calendar',
  };
}

// ===========================================
// Fingerprint Helper for Event Creation
// ===========================================

/**
 * Generate a fingerprint for a new event and check for duplicates.
 * Returns the fingerprint and any existing duplicate.
 */
export async function checkDuplicateEvent(
  householdId: string,
  eventData: { title: string; event_date: string; event_time?: string | null }
): Promise<{ fingerprint: string; duplicate: Event | null }> {
  const fingerprint = generateEventFingerprint({
    title: eventData.title,
    event_date: eventData.event_date,
    event_time: eventData.event_time,
  });

  const admin = getAdminClient();
  const { data: duplicate } = await admin
    .from('events')
    .select('*')
    .eq('event_fingerprint', fingerprint)
    .eq('household_id', householdId)
    .single();

  return { 
    fingerprint, 
    duplicate: duplicate as Event | null,
  };
}
