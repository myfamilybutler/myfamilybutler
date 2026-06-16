
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, updateEvent, deleteEvent, createEventReminder, createEvent } from '@/lib/supabase';
import { getEventsForHousehold, hydrateEventsWithFamilyMembers } from '@/lib/supabase/db-events';
import { ensureAndResolveFamilyMemberIds } from '@/lib/supabase/family-member-sync';
import { familyMemberNameKey, normalizeFamilyMemberName } from '@/lib/utils/family-members';
import { validateSession } from '@/lib/auth/helpers';
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { RECURRENCE_CANCELLED_MARKER } from '@/lib/recurrence/constants';
import { log, logError } from '@/lib/utils/logger';

interface EventUpdatesPayload {
  title?: string;
  event_date?: string;
  end_date?: string | null;
  event_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean;
  recurrence_rule?: string | null;
  recurrence_end?: string | null;
  family_member?: string | null;
  location?: string | null;
  description?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Enforce session validation.
    // Do NOT accept userId/supabaseUserId from params (IDOR risk).
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      logError('[API/events] Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    log.info(`[API/events] Fetching for verified user: ${userId}`);

    const supabase = getAdminClient();

    // 1. Get User & Household using TRUSTED session ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, household_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logError('[API/events] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.household_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Fetch Events for Household within the requested/default date window.
    const { searchParams } = new URL(request.url);
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth() - 3, 1)
      .toISOString()
      .split('T')[0];
    const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 6, 0)
      .toISOString()
      .split('T')[0];
    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;

    const rawEvents = await getEventsForHousehold(user.household_id, startDate, endDate);
    const hydratedEvents = await hydrateEventsWithFamilyMembers(rawEvents, user.household_id);

    return NextResponse.json({ success: true, data: hydratedEvents });

  } catch (error) {
    logError('[API/events] Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/events - Update an event
 */
export async function PUT(request: NextRequest) {
  try {
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      logError('[API/events] PUT Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const body = await request.json();
    const {
      eventId,
      updates,
      editScope,
      occurrenceDate,
    }: {
      eventId?: string;
      updates?: EventUpdatesPayload;
      editScope?: 'single' | 'series';
      occurrenceDate?: string;
    } = body;

    if (!eventId || !updates) {
      return NextResponse.json({ error: 'Missing eventId or updates' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Get user's household
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'User not found or no household' }, { status: 404 });
    }

    // Update a single occurrence of a recurring event by creating/updating an exception row.
    if (editScope === 'single' && occurrenceDate) {
      const { data: parentEvent, error: parentError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('household_id', user.household_id)
        .single();

      if (parentError || !parentEvent) {
        return NextResponse.json({ error: 'Parent event not found' }, { status: 404 });
      }

      const parentStart = parseISO(parentEvent.event_date);
      const parentEnd = parseISO(parentEvent.end_date || parentEvent.event_date);
      const parentDurationDays =
        isValid(parentStart) && isValid(parentEnd) && parentEnd >= parentStart
          ? differenceInCalendarDays(parentEnd, parentStart)
          : 0;

      const exceptionStart = updates.event_date || occurrenceDate;
      const defaultExceptionEnd = (() => {
        const parsedStart = parseISO(exceptionStart);
        if (!isValid(parsedStart) || parentDurationDays <= 0) return exceptionStart;
        return format(addDays(parsedStart, parentDurationDays), 'yyyy-MM-dd');
      })();
      const exceptionEnd = updates.end_date || defaultExceptionEnd;
      let nextFamilyMember =
        updates.family_member !== undefined ? updates.family_member : parentEvent.family_member;
      let nextFamilyMemberId: string | null = parentEvent.family_member_id || null;

      // When the family member name changes, resolve it to the matching
      // family_members row so the exception keeps its id linkage.
      if (updates.family_member !== undefined) {
        if (updates.family_member) {
          const normalized = normalizeFamilyMemberName(updates.family_member);
          if (normalized) {
            const memberIdsByKey = await ensureAndResolveFamilyMemberIds(
              user.household_id,
              [normalized]
            );
            nextFamilyMember = normalized;
            nextFamilyMemberId =
              memberIdsByKey.get(familyMemberNameKey(normalized)) ?? null;
          } else {
            nextFamilyMember = null;
            nextFamilyMemberId = null;
          }
        } else {
          nextFamilyMember = null;
          nextFamilyMemberId = null;
        }
      }

      const exceptionRow = {
        title: updates.title ?? parentEvent.title,
        event_date: exceptionStart,
        end_date: exceptionEnd,
        event_time: updates.event_time !== undefined ? updates.event_time : parentEvent.event_time,
        end_time: updates.end_time !== undefined ? updates.end_time : parentEvent.end_time,
        is_all_day: updates.is_all_day ?? parentEvent.is_all_day,
        recurrence_rule: null,
        recurrence_end: null,
        parent_event_id: eventId,
        is_exception: true,
        family_member: nextFamilyMember,
        family_member_id: nextFamilyMemberId,
        location: updates.location !== undefined ? updates.location : parentEvent.location,
        description: updates.description !== undefined ? updates.description : parentEvent.description,
        sync_source: 'local',
        household_id: user.household_id,
        created_by: userId,
        updated_at: new Date().toISOString(),
      };

      const { data: exception, error: upsertError } = await supabase
        .from('events')
        .upsert(exceptionRow, {
          onConflict: 'parent_event_id,event_date,is_exception',
        })
        .select('*')
        .single();

      if (upsertError || !exception) {
        return NextResponse.json({ error: 'Failed to update occurrence' }, { status: 500 });
      }

      log.info(`[API/events] Recurring exception ${exception.id} upserted for parent ${eventId} by user ${userId}`);
      return NextResponse.json({ success: true, data: exception });
    }

    // Update event or whole recurring series (security check via household_id)
    try {
      let updatesForSeries = updates;
      if (editScope === 'series' && occurrenceDate) {
        updatesForSeries = { ...updates };
        delete updatesForSeries.event_date;
        delete updatesForSeries.end_date;
      }

      const updatedEvent = await updateEvent(eventId, user.household_id, updatesForSeries, userId);

      if (!updatedEvent) {
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
      }

      log.info(`[API/events] Event ${eventId} updated by user ${userId}`);
      return NextResponse.json({ success: true, data: updatedEvent });
    } catch (error) {
      if (error instanceof Error && error.message === 'EVENT_VERSION_CONFLICT') {
        return NextResponse.json({
          error: 'Event was modified by another user. Please refresh and try again.'
        }, { status: 409 });
      }
      throw error;
    }

  } catch (error) {
    logError('[API/events] PUT Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/events - Delete an event
 */
export async function DELETE(request: NextRequest) {
  try {
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      logError('[API/events] DELETE Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const scope = searchParams.get('scope');
    const occurrenceDate = searchParams.get('occurrenceDate');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Get user's household
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'User not found or no household' }, { status: 404 });
    }

    // Delete a single occurrence of a recurring series by adding/updating a cancellation exception.
    if (scope === 'single' && occurrenceDate) {
      const { data: parentEvent, error: parentError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('household_id', user.household_id)
        .single();

      if (parentError || !parentEvent) {
        return NextResponse.json({ error: 'Parent event not found' }, { status: 404 });
      }

      const cancellationRow = {
        title: parentEvent.title,
        event_date: occurrenceDate,
        end_date: occurrenceDate,
        event_time: null,
        end_time: null,
        is_all_day: true,
        recurrence_rule: null,
        recurrence_end: null,
        parent_event_id: eventId,
        is_exception: true,
        family_member: parentEvent.family_member,
        family_member_id: parentEvent.family_member_id || null,
        location: parentEvent.location,
        description: RECURRENCE_CANCELLED_MARKER,
        sync_source: 'local',
        household_id: user.household_id,
        created_by: userId,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('events')
        .upsert(cancellationRow, {
          onConflict: 'parent_event_id,event_date,is_exception',
        });

      if (upsertError) {
        return NextResponse.json({ error: 'Failed to cancel occurrence' }, { status: 500 });
      }

      log.info(`[API/events] Recurring occurrence ${occurrenceDate} cancelled for parent ${eventId}`);
      return NextResponse.json({ success: true });
    }

    // Delete event or entire recurring series (security check via household_id)
    const success = await deleteEvent(eventId, user.household_id, userId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    log.info(`[API/events] Event ${eventId} deleted by user ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    logError('[API/events] DELETE Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/events - Create a new event OR create a reminder for an event
 * 
 * For event creation: { action: 'create', title, event_date, ... }
 * For reminder creation: { action: 'reminder', eventId, eventTitle, remindAt, ... }
 * 
 * Legacy support: If no action specified but eventId/remindAt present, treat as reminder.
 */
export async function POST(request: NextRequest) {
  try {
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      logError('[API/events] POST Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const body = await request.json();
    
    // Determine action type
    const action = body.action || (body.eventId && body.remindAt ? 'reminder' : 'create');

    const supabase = getAdminClient();

    // Get user's household
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'User not found or no household' }, { status: 404 });
    }

    // ============ CREATE EVENT ============
    if (action === 'create') {
      const {
        title,
        event_date,
        end_date,
        event_time,
        end_time,
        is_all_day,
        recurrence_rule,
        recurrence_end,
        family_member,
        location,
        description,
      } = body;

      if (!title || !event_date) {
        return NextResponse.json({ 
          error: 'Missing required fields: title, event_date' 
        }, { status: 400 });
      }

      // Use static import (fixed circular dependency panic)
      // const { createEvent } = await import('@/lib/supabase/db-events');
      
      const event = await createEvent(user.household_id, userId, {
        title,
        event_date,
        end_date: end_date || event_date,
        event_time: event_time || undefined,
        end_time: end_time || undefined,
        is_all_day: is_all_day ?? !event_time,
        recurrence_rule: recurrence_rule || undefined,
        recurrence_end: recurrence_end || undefined,
        family_member: family_member || undefined,
        location: location || undefined,
        description: description || undefined,
      });

      if (!event) {
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
      }

      log.info(`[API/events] Event created by user ${userId}: "${title}"`);
      return NextResponse.json({ success: true, data: event });
    }

    // ============ CREATE REMINDER ============
    if (action === 'reminder') {
      const { eventId, eventTitle, remindAt, customMessage } = body;

      if (!eventId || !eventTitle || !remindAt) {
        return NextResponse.json({ 
          error: 'Missing required fields: eventId, eventTitle, remindAt' 
        }, { status: 400 });
      }

      // Verify event belongs to user's household
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('household_id', user.household_id)
        .single();

      if (eventError || !event) {
        return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
      }

      const remindAtDate = new Date(remindAt);

      // Guard against duplicate pending reminders for the same event/user/time.
      // The unique partial index idx_reminders_event_user_remind_at_unique prevents
      // races; this check returns the existing row without a conflict error.
      const { data: existingReminder } = await supabase
        .from('reminders')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('remind_at', remindAtDate.toISOString())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingReminder) {
        log.info(`[API/events] Existing pending reminder returned for event ${eventId}`);
        return NextResponse.json({ success: true, data: existingReminder });
      }

      // Create reminder
      const reminder = await createEventReminder(
        userId,
        eventId,
        eventTitle,
        remindAtDate,
        customMessage
      );

      if (!reminder) {
        return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
      }

      log.info(`[API/events] Reminder created for event ${eventId} by user ${userId}`);
      return NextResponse.json({ success: true, data: reminder });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    logError('[API/events] POST Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
