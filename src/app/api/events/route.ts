
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, updateEvent, deleteEvent, createEventReminder, createEvent } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';

export async function GET() {
  try {
    // SECURITY: Enforce session validation. 
    // Do NOT accept userId/supabaseUserId from params (IDOR risk).
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      console.error('[API/events] Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    console.log(`[API/events] Fetching for verified user: ${userId}`);

    const supabase = getAdminClient();

    // 1. Get User & Household using TRUSTED session ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, household_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[API/events] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.household_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Fetch Events for Household
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('household_id', user.household_id)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true });

    if (eventsError) {
      console.error('[API/events] Failed to fetch events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    const rawEvents = events || [];
    const memberIds = Array.from(
      new Set(
        rawEvents
          .map((event) => event.family_member_id as string | null | undefined)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: rawEvents });
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('family_members')
      .select('id, name')
      .eq('household_id', user.household_id)
      .in('id', memberIds);

    if (membersError) {
      console.error('[API/events] Failed to fetch family member labels:', membersError);
      return NextResponse.json({ success: true, data: rawEvents });
    }

    const nameById = new Map((memberRows || []).map((member) => [member.id, member.name]));
    const hydratedEvents = rawEvents.map((event) => ({
      ...event,
      family_member: event.family_member_id
        ? nameById.get(event.family_member_id) || event.family_member
        : event.family_member,
    }));

    return NextResponse.json({ success: true, data: hydratedEvents });

  } catch (error) {
    console.error('[API/events] Internal error:', error);
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
      console.error('[API/events] PUT Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const body = await request.json();
    const { eventId, updates } = body;

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

    // Update event (security check via household_id)
    try {
      const updatedEvent = await updateEvent(eventId, user.household_id, updates, userId);

      if (!updatedEvent) {
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
      }

      console.log(`[API/events] Event ${eventId} updated by user ${userId}`);
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
    console.error('[API/events] PUT Internal error:', error);
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
      console.error('[API/events] DELETE Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

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

    // Delete event (security check via household_id)
    const success = await deleteEvent(eventId, user.household_id, userId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    console.log(`[API/events] Event ${eventId} deleted by user ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API/events] DELETE Internal error:', error);
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
      console.error('[API/events] POST Auth failed:', error);
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
      const { title, event_date, end_date, event_time, end_time, is_all_day, family_member, location, description } = body;

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
        family_member: family_member || undefined,
        location: location || undefined,
        description: description || undefined,
      });

      if (!event) {
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
      }

      console.log(`[API/events] Event created by user ${userId}: "${title}"`);
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

      // Create reminder
      const reminder = await createEventReminder(
        userId,
        eventId,
        eventTitle,
        new Date(remindAt),
        customMessage
      );

      if (!reminder) {
        return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
      }

      console.log(`[API/events] Reminder created for event ${eventId} by user ${userId}`);
      return NextResponse.json({ success: true, data: reminder });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[API/events] POST Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
