/**
 * Event Database Operations with Optimistic Locking
 * 
 * Implements version-based optimistic locking to prevent race conditions
 * during concurrent updates.
 */

import type { Event, Reminder } from '@/types';
import { getAdminClient } from './client';
import { generateEventFingerprint } from '../sync/event-fingerprint';
import { pushCreateToGoogle, pushUpdateToGoogle, pushDeleteToGoogle } from '../sync/google-sync-service';
import { ensureAndResolveFamilyMemberIds } from './family-member-sync';
import { familyMemberNameKey, normalizeFamilyMemberName } from '@/lib/utils/family-members';

function isMissingFamilyMemberIdColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    (message.includes('family_member_id') &&
      (message.includes('schema cache') || message.includes('column') || message.includes('does not exist')))
  );
}

/**
 * Create a new event with deduplication and Google Calendar sync.
 * 
 * RACE CONDITION PROTECTION:
 * Uses unique index on (household_id, event_fingerprint) to prevent duplicates.
 * If race condition occurs, catches constraint violation and returns existing event.
 */
export async function createEvent(
  householdId: string,
  createdBy: string,
  eventData: {
    title: string;
    event_date: string;
    end_date?: string;
    event_time?: string;
    end_time?: string;
    is_all_day: boolean;
    family_member?: string;
    location?: string;
    description?: string;
    source_message_id?: string;
  }
): Promise<Event | null> {
  const admin = getAdminClient();
  const normalizedFamilyMember = eventData.family_member
    ? normalizeFamilyMemberName(eventData.family_member)
    : undefined;
  const memberIdsByKey = await ensureAndResolveFamilyMemberIds(householdId, [normalizedFamilyMember]);
  const resolvedFamilyMemberId = normalizedFamilyMember
    ? memberIdsByKey.get(familyMemberNameKey(normalizedFamilyMember)) ?? null
    : null;
  
  // Generate fingerprint for deduplication
  const fingerprint = generateEventFingerprint({
    title: eventData.title,
    event_date: eventData.event_date,
    event_time: eventData.event_time,
  });

  const insertPayload = {
    household_id: householdId,
    created_by: createdBy,
    title: eventData.title,
    event_date: eventData.event_date,
    end_date: eventData.end_date || eventData.event_date,
    event_time: eventData.event_time || null,
    end_time: eventData.end_time || null,
    is_all_day: eventData.is_all_day,
    family_member: normalizedFamilyMember || null,
    family_member_id: resolvedFamilyMemberId,
    location: eventData.location || null,
    description: eventData.description || null,
    source_message_id: eventData.source_message_id || null,
    event_fingerprint: fingerprint,
    sync_source: 'local',
  };

  // Try to insert directly (relies on unique constraint for atomicity)
  let { data, error } = await admin
    .from('events')
    .insert(insertPayload)
    .select()
    .single();

  if (isMissingFamilyMemberIdColumnError(error)) {
    console.warn('[Event] family_member_id column missing; retrying insert without FK linkage');
    const fallbackPayload = { ...insertPayload };
    delete (fallbackPayload as { family_member_id?: string | null }).family_member_id;

    const retry = await admin
      .from('events')
      .insert(fallbackPayload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }
  
  // Handle duplicate (unique constraint violation)
  if (error?.code === '23505') {
    // Unique violation - fetch existing event
    console.log(`[Event] Duplicate detected via constraint: "${eventData.title}"`);
    const { data: existing } = await admin
      .from('events')
      .select('*')
      .eq('event_fingerprint', fingerprint)
      .eq('household_id', householdId)
      .single();

    if (
      existing &&
      normalizedFamilyMember &&
      resolvedFamilyMemberId &&
      !existing.family_member_id
    ) {
      await admin
        .from('events')
        .update({ family_member_id: resolvedFamilyMemberId })
        .eq('id', existing.id)
        .eq('household_id', householdId);
    }
    
    return existing as Event | null;
  }
  
  if (error) {
    console.error('Error creating event:', error);
    return null;
  }
  
  const event = data as Event;

  // Sync to Google Calendar (non-blocking)
  if (createdBy) {
    pushCreateToGoogle(createdBy, event).catch((syncError) => {
      console.log('[GoogleSync] Sync skipped or failed:', syncError);
    });
  }
  
  return event;
}

/**
 * Create many events in one DB call.
 * Uses the same fingerprint dedup logic as createEvent and skips duplicates via upsert.
 */
export async function createEventsBulk(
  householdId: string,
  createdBy: string,
  events: Array<{
    title: string;
    event_date: string;
    end_date?: string;
    event_time?: string;
    end_time?: string;
    is_all_day: boolean;
    family_member?: string;
    location?: string;
    description?: string;
    source_message_id?: string;
  }>
): Promise<Event[]> {
  if (events.length === 0) {
    return [];
  }

  const admin = getAdminClient();
  const preparedEvents = events.map((eventData) => ({
    ...eventData,
    family_member: eventData.family_member
      ? normalizeFamilyMemberName(eventData.family_member)
      : undefined,
  }));
  const memberIdsByKey = await ensureAndResolveFamilyMemberIds(
    householdId,
    preparedEvents.map((event) => event.family_member)
  );

  const rows = preparedEvents.map((eventData) => {
    const fingerprint = generateEventFingerprint({
      title: eventData.title,
      event_date: eventData.event_date,
      event_time: eventData.event_time,
    });

    return {
      household_id: householdId,
      created_by: createdBy,
      title: eventData.title,
      event_date: eventData.event_date,
      end_date: eventData.end_date || eventData.event_date,
      event_time: eventData.event_time || null,
      end_time: eventData.end_time || null,
      is_all_day: eventData.is_all_day,
      family_member: eventData.family_member || null,
      family_member_id: eventData.family_member
        ? memberIdsByKey.get(familyMemberNameKey(eventData.family_member)) ?? null
        : null,
      location: eventData.location || null,
      description: eventData.description || null,
      source_message_id: eventData.source_message_id || null,
      event_fingerprint: fingerprint,
      sync_source: 'local',
    };
  });

  let { data, error } = await admin
    .from('events')
    .upsert(rows, {
      onConflict: 'household_id,event_fingerprint',
      ignoreDuplicates: true,
    })
    .select('*');

  if (isMissingFamilyMemberIdColumnError(error)) {
    console.warn('[Event] family_member_id column missing; retrying bulk upsert without FK linkage');
    const fallbackRows = rows.map((row) => {
      const next = { ...row };
      delete (next as { family_member_id?: string | null }).family_member_id;
      return next;
    });

    const retry = await admin
      .from('events')
      .upsert(fallbackRows, {
        onConflict: 'household_id,event_fingerprint',
        ignoreDuplicates: true,
      })
      .select('*');

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (error.code === '42P10') {
      console.warn('[Event] Missing unique constraint for bulk upsert; falling back to row inserts');
      const created: Event[] = [];

      for (const eventData of events) {
        const inserted = await createEvent(householdId, createdBy, eventData);
        if (inserted) {
          created.push(inserted);
        }
      }

      return created;
    }

    console.error('Error creating events in bulk:', error);
    return [];
  }

  const createdEvents = (data ?? []) as Event[];

  if (createdBy && createdEvents.length > 0) {
    void Promise.allSettled(
      createdEvents.map((event) => pushCreateToGoogle(createdBy, event))
    );
  }

  return createdEvents;
}

/**
 * Get events for a household with optional date filtering
 */
export async function getEventsForHousehold(
  householdId: string,
  startDate?: string,
  endDate?: string
): Promise<Event[]> {
  const admin = getAdminClient();
  
  let query = admin
    .from('events')
    .select('*')
    .eq('household_id', householdId)
    .order('event_date', { ascending: true });
  
  if (startDate) {
    query = query.gte('event_date', startDate);
  }
  
  if (endDate) {
    query = query.lte('event_date', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return (data ?? []) as Event[];
}

/**
 * Update an existing event with optimistic locking.
 * 
 * Uses version-based optimistic locking to prevent lost updates.
 * If the event was modified since it was read, the update will fail.
 */
export async function updateEvent(
  eventId: string,
  householdId: string,
  updates: {
    title?: string;
    event_date?: string;
    end_date?: string | null;
    event_time?: string | null;
    end_time?: string | null;
    is_all_day?: boolean;
    family_member?: string | null;
    location?: string | null;
    description?: string | null;
  },
  userId?: string,
  expectedVersion?: number  // For optimistic locking
): Promise<Event | null> {
  const admin = getAdminClient();
  let normalizedFamilyMember: string | null | undefined;
  let resolvedFamilyMemberId: string | null | undefined;
  if (updates.family_member !== undefined) {
    normalizedFamilyMember = updates.family_member
      ? normalizeFamilyMemberName(updates.family_member)
      : null;
    if (normalizedFamilyMember) {
      const memberIdsByKey = await ensureAndResolveFamilyMemberIds(householdId, [normalizedFamilyMember]);
      resolvedFamilyMemberId = memberIdsByKey.get(familyMemberNameKey(normalizedFamilyMember)) ?? null;
    } else {
      resolvedFamilyMemberId = null;
    }
  }
  
  // First, get current event with version
  const { data: current, error: fetchError } = await admin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('household_id', householdId)
    .single();
  
  if (fetchError || !current) {
    console.error('Error fetching event for update:', fetchError);
    return null;
  }
  
  // Normalize version (null becomes 0)
  const currentVersion = current.version ?? 0;
  
  // Check version for optimistic locking
  if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
    console.error(`[Event] Version conflict: expected ${expectedVersion}, got ${currentVersion}`);
    throw new Error('EVENT_VERSION_CONFLICT');
  }
  
  // Build update object
  const updateData: Record<string, unknown> = {
    version: currentVersion + 1, // Increment version
    updated_at: new Date().toISOString(),
  };
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.event_date !== undefined) updateData.event_date = updates.event_date;
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
  if (updates.event_time !== undefined) updateData.event_time = updates.event_time;
  if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
  if (updates.is_all_day !== undefined) updateData.is_all_day = updates.is_all_day;
  if (updates.family_member !== undefined) {
    updateData.family_member = normalizedFamilyMember ?? null;
    updateData.family_member_id = resolvedFamilyMemberId ?? null;
  }
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.description !== undefined) updateData.description = updates.description;

  // Keep date ranges valid when only start date changes.
  if (
    updates.event_date !== undefined &&
    updates.end_date === undefined &&
    current.end_date &&
    current.end_date < updates.event_date
  ) {
    updateData.end_date = updates.event_date;
  }

  // If title, date, or time changed, regenerate fingerprint
  if (updates.title !== undefined || updates.event_date !== undefined || updates.event_time !== undefined) {
    const newFingerprint = generateEventFingerprint({
      title: updates.title ?? current.title,
      event_date: updates.event_date ?? current.event_date,
      event_time: updates.event_time !== undefined ? updates.event_time : current.event_time,
    });
    updateData.event_fingerprint = newFingerprint;
  }
  
  // Perform update with version check
  // Handle both null and numeric versions for backwards compatibility
  const versionQuery = current.version === null || current.version === undefined
    ? admin.from('events').update(updateData).eq('id', eventId).eq('household_id', householdId).is('version', null)
    : admin.from('events').update(updateData).eq('id', eventId).eq('household_id', householdId).eq('version', current.version);
    
  let { data, error } = await versionQuery.select().single();

  if (isMissingFamilyMemberIdColumnError(error) && 'family_member_id' in updateData) {
    console.warn('[Event] family_member_id column missing; retrying update without FK linkage');
    const fallbackUpdateData = { ...updateData };
    delete (fallbackUpdateData as { family_member_id?: string | null }).family_member_id;

    const fallbackVersionQuery = current.version === null || current.version === undefined
      ? admin.from('events').update(fallbackUpdateData).eq('id', eventId).eq('household_id', householdId).is('version', null)
      : admin.from('events').update(fallbackUpdateData).eq('id', eventId).eq('household_id', householdId).eq('version', current.version);

    const retry = await fallbackVersionQuery.select().single();
    data = retry.data;
    error = retry.error;
  }
  
  if (error) {
    console.error('Error updating event:', error);
    return null;
  }
  
  // If no data returned, the version check failed (event was modified by another process)
  if (!data) {
    console.error(`[Event] Update failed: version mismatch for event ${eventId}. Expected version ${current.version}`);
    throw new Error('EVENT_VERSION_CONFLICT');
  }
  
  const event = data as Event;

  // Sync to Google Calendar (non-blocking)
  if (userId) {
    pushUpdateToGoogle(userId, event).catch((syncError) => {
      console.log('[GoogleSync] Update sync skipped or failed:', syncError);
    });
  }
  
  return event;
}

/**
 * Delete an event with Google Calendar sync.
 */
export async function deleteEvent(
  eventId: string,
  householdId: string,
  userId?: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  // Get the google_event_id before deleting (for Google sync)
  let googleEventId: string | null = null;
  if (userId) {
    const { data: existingEvent } = await admin
      .from('events')
      .select('google_event_id')
      .eq('id', eventId)
      .eq('household_id', householdId)
      .single();
    
    googleEventId = existingEvent?.google_event_id || null;
  }
  
  const { error } = await admin
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('household_id', householdId);
  
  if (error) {
    console.error('Error deleting event:', error);
    return false;
  }
  
  // Sync deletion to Google Calendar (non-blocking)
  if (userId && googleEventId) {
    pushDeleteToGoogle(userId, googleEventId).catch(() => {
      console.log('[GoogleSync] Delete sync skipped or failed');
    });
  }
  
  return true;
}

/**
 * Create a reminder linked to an event
 */
export async function createEventReminder(
  userId: string,
  eventId: string,
  eventTitle: string,
  remindAt: Date,
  customMessage?: string
): Promise<Reminder | null> {
  const admin = getAdminClient();
  
  const message = customMessage || `📅 Reminder: ${eventTitle}`;
  
  const { data, error } = await admin
    .from('reminders')
    .insert({
      user_id: userId,
      message,
      remind_at: remindAt.toISOString(),
      status: 'pending',
      event_id: eventId,
    })
    .select()
    .single();
  
  if (error) {
    // If event_id column doesn't exist, retry without it
    if (error.message?.includes('event_id')) {
      const { data: fallbackData, error: fallbackError } = await admin
        .from('reminders')
        .insert({
          user_id: userId,
          message,
          remind_at: remindAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();
      
      if (fallbackError) {
        console.error('Error creating event reminder (fallback):', fallbackError);
        return null;
      }
      
      return fallbackData as Reminder;
    }
    
    console.error('Error creating event reminder:', error);
    return null;
  }
  
  return data as Reminder;
}

// ===========================================
// Draft Events (Low Confidence)
// ===========================================

interface DraftEventInput {
  title: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  family_member?: string;
  location?: string;
  description?: string;
  reason: 'low_confidence' | 'missing_info' | 'user_requested';
  confidence: number;
}

interface DraftBundleSummary {
  id: string;
  household_id: string;
  created_by: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  reason: string;
  confidence: number;
  created_at: string;
  expires_at: string;
}

interface DraftBundleEvent {
  id: string;
  bundle_id: string | null;
  title: string;
  event_date: string;
  event_time?: string | null;
  end_time?: string | null;
  is_all_day: boolean;
  family_member?: string | null;
  location?: string | null;
  description?: string | null;
  confidence: number;
  reason: string;
}

interface DraftModification {
  field: string;
  newValue: string;
}

/**
 * Create a bundle of draft events for a single user message.
 * Preferred path for multi-event extraction.
 */
export async function createDraftBundle(
  householdId: string,
  createdBy: string,
  events: DraftEventInput[]
): Promise<{ bundleId: string; eventCount: number } | null> {
  if (events.length === 0) {
    return null;
  }

  const admin = getAdminClient();
  const avgConfidence = events.reduce((sum, event) => sum + event.confidence, 0) / events.length;
  const dominantReason = events[0]?.reason ?? 'low_confidence';

  try {
    const { data: bundle, error: bundleError } = await admin
      .from('draft_bundles')
      .insert({
        household_id: householdId,
        created_by: createdBy,
        status: 'pending',
        reason: dominantReason,
        confidence: avgConfidence,
      })
      .select('id')
      .single();

    if (bundleError || !bundle?.id) {
      console.error('[DraftBundle] Failed to create bundle:', bundleError);
      const fallback = await createDraftEvent(householdId, createdBy, events[0]!);
      return fallback ? { bundleId: fallback.id, eventCount: 1 } : null;
    }

    const rows = events.map((event) => ({
      household_id: householdId,
      created_by: createdBy,
      bundle_id: bundle.id,
      title: event.title,
      event_date: event.event_date,
      event_time: event.event_time || null,
      end_time: event.end_time || null,
      is_all_day: event.is_all_day ?? !event.event_time,
      family_member: event.family_member || null,
      location: event.location || null,
      description: event.description || null,
      reason: event.reason,
      confidence: event.confidence,
      status: 'pending',
    }));

    const { error: eventError } = await admin
      .from('draft_events')
      .insert(rows);

    if (eventError) {
      console.error('[DraftBundle] Failed to create draft events:', eventError);
      await admin.from('draft_bundles').delete().eq('id', bundle.id);

      const fallback = await createDraftEvent(householdId, createdBy, events[0]!);
      return fallback ? { bundleId: fallback.id, eventCount: 1 } : null;
    }

    return { bundleId: bundle.id, eventCount: events.length };
  } catch (err) {
    console.error('[DraftBundle] Unexpected error:', err);
    const fallback = await createDraftEvent(householdId, createdBy, events[0]!);
    return fallback ? { bundleId: fallback.id, eventCount: 1 } : null;
  }
}

/**
 * Get bundle metadata + all pending draft events in the bundle.
 */
export async function getDraftBundle(
  bundleId: string,
  householdId: string
): Promise<{ bundle: DraftBundleSummary; events: DraftBundleEvent[] } | null> {
  const admin = getAdminClient();

  try {
    const { data: bundle, error: bundleError } = await admin
      .from('draft_bundles')
      .select('*')
      .eq('id', bundleId)
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .single();

    if (bundleError || !bundle) {
      return null;
    }

    const { data: events, error: eventsError } = await admin
      .from('draft_events')
      .select('*')
      .eq('bundle_id', bundleId)
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });

    if (eventsError || !events || events.length === 0) {
      return null;
    }

    return {
      bundle: bundle as DraftBundleSummary,
      events: events as DraftBundleEvent[],
    };
  } catch (err) {
    console.error('[DraftBundle] Error fetching bundle:', err);
    return null;
  }
}

/**
 * Get latest pending draft bundle created by a user.
 * Used as recovery path if conversation state is missing.
 */
export async function getLatestPendingDraftBundle(
  householdId: string,
  createdBy: string
): Promise<{ bundleId: string; eventCount: number } | null> {
  const admin = getAdminClient();

  try {
    const { data: bundle, error: bundleError } = await admin
      .from('draft_bundles')
      .select('id')
      .eq('household_id', householdId)
      .eq('created_by', createdBy)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bundleError || !bundle?.id) {
      return null;
    }

    const { count, error: countError } = await admin
      .from('draft_events')
      .select('id', { count: 'exact', head: true })
      .eq('bundle_id', bundle.id)
      .eq('household_id', householdId)
      .eq('status', 'pending');

    if (countError || !count || count <= 0) {
      return null;
    }

    return { bundleId: bundle.id, eventCount: count };
  } catch (err) {
    console.error('[DraftBundle] Error recovering latest pending bundle:', err);
    return null;
  }
}

/**
 * Get latest pending legacy draft event created by a user.
 */
export async function getLatestPendingDraftEvent(
  householdId: string,
  createdBy: string
): Promise<{ draftId: string } | null> {
  const admin = getAdminClient();

  try {
    const { data, error } = await admin
      .from('draft_events')
      .select('id')
      .eq('household_id', householdId)
      .eq('created_by', createdBy)
      .is('bundle_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      return null;
    }

    return { draftId: data.id };
  } catch (err) {
    console.error('[DraftEvent] Error recovering latest pending draft:', err);
    return null;
  }
}

/**
 * Confirm all pending events in a draft bundle and create real events.
 * Atomic behavior at app layer: if not all events can be created, roll back created events.
 */
export async function confirmDraftBundle(
  bundleId: string,
  householdId: string,
  userId: string
): Promise<Event[] | null> {
  const admin = getAdminClient();
  const bundleData = await getDraftBundle(bundleId, householdId);

  if (!bundleData) {
    return null;
  }

  const eventInputs = bundleData.events.map((draft) => ({
    title: draft.title,
    event_date: draft.event_date,
    event_time: draft.event_time ?? undefined,
    end_time: draft.end_time ?? undefined,
    is_all_day: draft.is_all_day,
    family_member: draft.family_member ?? undefined,
    location: draft.location ?? undefined,
    description: draft.description ?? undefined,
  }));

  const created = await createEventsBulk(householdId, userId, eventInputs);

  if (created.length !== eventInputs.length) {
    if (created.length > 0) {
      await Promise.allSettled(
        created.map((event) =>
          admin.from('events').delete().eq('id', event.id).eq('household_id', householdId)
        )
      );
    }
    return null;
  }

  await admin
    .from('draft_events')
    .update({ status: 'confirmed' })
    .eq('bundle_id', bundleId)
    .eq('household_id', householdId)
    .eq('status', 'pending');

  await admin
    .from('draft_bundles')
    .update({ status: 'confirmed' })
    .eq('id', bundleId)
    .eq('household_id', householdId);

  return created;
}

/**
 * Reject all draft events in a bundle.
 */
export async function rejectDraftBundle(
  bundleId: string,
  householdId: string
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { error: eventError } = await admin
      .from('draft_events')
      .update({ status: 'rejected' })
      .eq('bundle_id', bundleId)
      .eq('household_id', householdId)
      .eq('status', 'pending');

    if (eventError) {
      console.error('[DraftBundle] Error rejecting draft events:', eventError);
      return false;
    }

    const { error: bundleError } = await admin
      .from('draft_bundles')
      .update({ status: 'rejected' })
      .eq('id', bundleId)
      .eq('household_id', householdId);

    if (bundleError) {
      console.error('[DraftBundle] Error rejecting bundle:', bundleError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[DraftBundle] Unexpected reject error:', err);
    return false;
  }
}

function normalizeDraftField(field: string): 'title' | 'event_date' | 'event_time' | 'location' | 'family_member' | null {
  const key = field.toLowerCase();
  if (key === 'title') return 'title';
  if (key === 'date' || key === 'event_date') return 'event_date';
  if (key === 'time' || key === 'event_time') return 'event_time';
  if (key === 'location') return 'location';
  if (key === 'family_member' || key === 'member') return 'family_member';
  return null;
}

function normalizeTimeValue(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const ampm = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = ampm[2] ?? '00';
    const period = ampm[3];
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  const direct = trimmed.replace('.', ':').match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!direct) return null;
  const hour = Number(direct[1]);
  const minute = direct[2] ?? '00';
  if (hour < 0 || hour > 23) return null;
  if (Number(minute) < 0 || Number(minute) > 59) return null;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function normalizeDateValue(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dotDate = trimmed.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\.?$/);
  if (!dotDate) return null;

  const day = Number(dotDate[1]);
  const month = Number(dotDate[2]);
  let year = dotDate[3] ? Number(dotDate[3]) : new Date().getFullYear();
  if (year < 100) {
    year += 2000;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getWeekdayTargets(
  events: DraftBundleEvent[],
  userMessage: string
): string[] {
  const lower = userMessage.toLowerCase();
  const weekdayMap: Record<string, number> = {
    monday: 1,
    montag: 1,
    tuesday: 2,
    dienstag: 2,
    wednesday: 3,
    mittwoch: 3,
    thursday: 4,
    donnerstag: 4,
    friday: 5,
    freitag: 5,
    saturday: 6,
    samstag: 6,
    sonntag: 0,
    sunday: 0,
  };

  const targetWeekdays = Object.entries(weekdayMap)
    .filter(([name]) => lower.includes(name))
    .map(([, day]) => day);

  if (targetWeekdays.length === 0) {
    return [];
  }

  return events
    .filter((event) => {
      const day = new Date(`${event.event_date}T00:00:00`).getDay();
      return targetWeekdays.includes(day);
    })
    .map((event) => event.id);
}

/**
 * Apply modify-specific patches to a draft bundle.
 * Returns updated events or an ambiguity signal if a target event cannot be resolved.
 */
export async function applyDraftBundleModifications(
  bundleId: string,
  householdId: string,
  modifications: DraftModification[],
  userMessage: string
): Promise<{ events: DraftBundleEvent[]; ambiguousTarget: boolean } | null> {
  const admin = getAdminClient();
  const bundle = await getDraftBundle(bundleId, householdId);

  if (!bundle || modifications.length === 0) {
    return null;
  }

  const weekdayTargets = getWeekdayTargets(bundle.events, userMessage);

  for (const modification of modifications) {
    const field = normalizeDraftField(modification.field);
    if (!field) {
      continue;
    }

    const targetIds = bundle.events.length === 1
      ? [bundle.events[0]!.id]
      : weekdayTargets;

    if (bundle.events.length > 1 && targetIds.length === 0) {
      return { events: bundle.events, ambiguousTarget: true };
    }

    const updateData: Record<string, unknown> = {};
    if (field === 'event_time') {
      const timeValue = normalizeTimeValue(modification.newValue);
      if (!timeValue) continue;
      updateData.event_time = timeValue;
      updateData.is_all_day = false;
    } else if (field === 'event_date') {
      const dateValue = normalizeDateValue(modification.newValue);
      if (!dateValue) continue;
      updateData.event_date = dateValue;
    } else {
      updateData[field] = modification.newValue.trim();
    }

    for (const targetId of targetIds) {
      const { error } = await admin
        .from('draft_events')
        .update(updateData)
        .eq('id', targetId)
        .eq('household_id', householdId)
        .eq('bundle_id', bundleId)
        .eq('status', 'pending');

      if (error) {
        console.error('[DraftBundle] Failed to update draft event:', error);
      }
    }
  }

  const refreshed = await getDraftBundle(bundleId, householdId);
  if (!refreshed) {
    return null;
  }

  return { events: refreshed.events, ambiguousTarget: false };
}

/**
 * Apply modify-specific patches to a single legacy draft.
 */
export async function applyDraftEventModifications(
  draftId: string,
  householdId: string,
  modifications: DraftModification[]
): Promise<DraftBundleEvent | null> {
  const admin = getAdminClient();

  if (modifications.length === 0) {
    return null;
  }

  const updateData: Record<string, unknown> = {};

  for (const modification of modifications) {
    const field = normalizeDraftField(modification.field);
    if (!field) {
      continue;
    }

    if (field === 'event_time') {
      const timeValue = normalizeTimeValue(modification.newValue);
      if (!timeValue) continue;
      updateData.event_time = timeValue;
      updateData.is_all_day = false;
      continue;
    }

    if (field === 'event_date') {
      const dateValue = normalizeDateValue(modification.newValue);
      if (!dateValue) continue;
      updateData.event_date = dateValue;
      continue;
    }

    updateData[field] = modification.newValue.trim();
  }

  if (Object.keys(updateData).length === 0) {
    return null;
  }

  const { error } = await admin
    .from('draft_events')
    .update(updateData)
    .eq('id', draftId)
    .eq('household_id', householdId)
    .eq('status', 'pending');

  if (error) {
    console.error('[DraftEvent] Failed to update draft event:', error);
    return null;
  }

  const { data, error: fetchError } = await admin
    .from('draft_events')
    .select('*')
    .eq('id', draftId)
    .eq('household_id', householdId)
    .single();

  if (fetchError || !data) {
    return null;
  }

  return data as DraftBundleEvent;
}

/**
 * Create a draft event for low-confidence extractions
 */
export async function createDraftEvent(
  householdId: string,
  createdBy: string,
  draftData: DraftEventInput
): Promise<{ id: string } | null> {
  const admin = getAdminClient();
  
  try {
    const { data, error } = await admin
      .from('draft_events')
      .insert({
        household_id: householdId,
        created_by: createdBy,
        title: draftData.title,
        event_date: draftData.event_date,
        event_time: draftData.event_time || null,
        end_time: draftData.end_time || null,
        is_all_day: draftData.is_all_day ?? !draftData.event_time,
        family_member: draftData.family_member || null,
        location: draftData.location || null,
        description: draftData.description || null,
        reason: draftData.reason,
        confidence: draftData.confidence,
        status: 'pending',
      })
      .select('id')
      .single();
    
    if (error) {
      // Table might not exist yet - log and return null
      console.log('[DraftEvent] draft_events table may not exist, skipping draft:', error.message);
      
      // Fallback: Create regular event but add a note in description
      const fallbackEvent = await createEvent(householdId, createdBy, {
        title: `📝 ${draftData.title}`,
        event_date: draftData.event_date,
        event_time: draftData.event_time,
        end_time: draftData.end_time,
        is_all_day: draftData.is_all_day ?? !draftData.event_time,
        family_member: draftData.family_member,
        location: draftData.location,
        description: `⚠️ Zu prüfen (${Math.round(draftData.confidence * 100)}% sicher)\n${draftData.description || ''}`,
      });
      
      return fallbackEvent ? { id: fallbackEvent.id } : null;
    }
    
    console.log(`[DraftEvent] Created draft: "${draftData.title}" (${Math.round(draftData.confidence * 100)}% confidence)`);
    return data as { id: string };
    
  } catch (err) {
    console.error('[DraftEvent] Error creating draft:', err);
    return null;
  }
}

/**
 * Confirm a draft event and convert it to a real event
 */
export async function confirmDraftEvent(
  draftId: string,
  householdId: string,
  userId: string
): Promise<Event | null> {
  const admin = getAdminClient();
  
  try {
    // Get the draft
    const { data: draft, error: fetchError } = await admin
      .from('draft_events')
      .select('*')
      .eq('id', draftId)
      .eq('household_id', householdId)
      .single();
    
    if (fetchError || !draft) {
      console.error('[DraftEvent] Draft not found:', fetchError);
      return null;
    }
    
    // Create real event
    const event = await createEvent(householdId, userId, {
      title: draft.title,
      event_date: draft.event_date,
      event_time: draft.event_time,
      end_time: draft.end_time,
      is_all_day: draft.is_all_day,
      family_member: draft.family_member,
      location: draft.location,
      description: draft.description,
    });
    
    if (!event) {
      return null;
    }
    
    // Delete the draft
    await admin
      .from('draft_events')
      .delete()
      .eq('id', draftId);
    
    console.log(`[DraftEvent] Confirmed draft: "${draft.title}"`);
    return event;
    
  } catch (err) {
    console.error('[DraftEvent] Error confirming draft:', err);
    return null;
  }
}

/**
 * Reject/delete a draft event
 */
export async function rejectDraftEvent(
  draftId: string,
  householdId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('draft_events')
    .delete()
    .eq('id', draftId)
    .eq('household_id', householdId);
  
  if (error) {
    console.error('[DraftEvent] Error rejecting draft:', error);
    return false;
  }
  
  return true;
}

/**
 * Get a single draft event by ID
 */
export async function getDraftEvent(
  draftId: string,
  householdId: string
): Promise<{
  id: string;
  title: string;
  event_date: string;
  event_time?: string | null;
  end_time?: string | null;
  is_all_day: boolean;
  family_member?: string | null;
  location?: string | null;
  description?: string | null;
  confidence: number;
  reason: string;
} | null> {
  const admin = getAdminClient();
  
  try {
    const { data, error } = await admin
      .from('draft_events')
      .select('*')
      .eq('id', draftId)
      .eq('household_id', householdId)
      .single();
    
    if (error || !data) {
      console.log('[DraftEvent] Draft not found:', error?.message);
      return null;
    }
    
    return data as {
      id: string;
      title: string;
      event_date: string;
      event_time?: string | null;
      end_time?: string | null;
      is_all_day: boolean;
      family_member?: string | null;
      location?: string | null;
      description?: string | null;
      confidence: number;
      reason: string;
    };
  } catch (err) {
    console.error('[DraftEvent] Error fetching draft:', err);
    return null;
  }
}

/**
 * Get pending drafts for a household
 */
export async function getDraftEvents(householdId: string): Promise<Array<{
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  confidence: number;
  reason: string;
  created_at: string;
}>> {
  const admin = getAdminClient();
  
  try {
    const { data, error } = await admin
      .from('draft_events')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log('[DraftEvent] Could not fetch drafts:', error.message);
      return [];
    }
    
    return data || [];
  } catch {
    return [];
  }
}
