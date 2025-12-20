/**
 * Event Database Operations
 */
import type { Event, Reminder } from '@/types';
import { getAdminClient } from './client';
import { syncEventToGoogle } from '../sync/google';

/**
 * Create a new event
 */
export async function createEvent(
  householdId: string,
  createdBy: string,
  eventData: {
    title: string;
    event_date: string;
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
  
  const { data, error } = await admin
    .from('events')
    .insert({
      household_id: householdId,
      created_by: createdBy,
      title: eventData.title,
      event_date: eventData.event_date,
      event_time: eventData.event_time || null,
      end_time: eventData.end_time || null,
      is_all_day: eventData.is_all_day,
      family_member: eventData.family_member || null,
      location: eventData.location || null,
      description: eventData.description || null,
      source_message_id: eventData.source_message_id || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    return null;
  }
  
  const event = data as Event;

  // Sync to Google Calendar (non-blocking)
  // Only sync if createdBy is a valid user ID
  if (createdBy) {
    syncEventToGoogle(createdBy, event).catch((syncError) => {
      console.log('[GoogleSync] Sync skipped or failed:', syncError);
    });
  }
  
  return event;
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
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  householdId: string,
  updates: {
    title?: string;
    event_date?: string;
    event_time?: string | null;
    end_time?: string | null;
    is_all_day?: boolean;
    family_member?: string | null;
    location?: string | null;
    description?: string | null;
  }
): Promise<Event | null> {
  const admin = getAdminClient();
  
  // Build update object, only including defined fields
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.event_date !== undefined) updateData.event_date = updates.event_date;
  if (updates.event_time !== undefined) updateData.event_time = updates.event_time;
  if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
  if (updates.is_all_day !== undefined) updateData.is_all_day = updates.is_all_day;
  if (updates.family_member !== undefined) updateData.family_member = updates.family_member;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.description !== undefined) updateData.description = updates.description;
  
  const { data, error } = await admin
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .eq('household_id', householdId) // Security: ensure user owns this event
    .select()
    .single();
  
  if (error) {
    console.error('Error updating event:', error);
    return null;
  }
  
  return data as Event;
}

/**
 * Delete an event
 */
export async function deleteEvent(
  eventId: string,
  householdId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('household_id', householdId); // Security: ensure user owns this event
  
  if (error) {
    console.error('Error deleting event:', error);
    return false;
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
          message: `${message} (Event: ${eventId})`,
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
