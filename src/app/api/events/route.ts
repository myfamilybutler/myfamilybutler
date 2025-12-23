
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, updateEvent, deleteEvent, createEventReminder } from '@/lib/supabase';
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

    return NextResponse.json({ success: true, data: events });

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
    const updatedEvent = await updateEvent(eventId, user.household_id, updates, userId);

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    console.log(`[API/events] Event ${eventId} updated by user ${userId}`);
    return NextResponse.json({ success: true, data: updatedEvent });

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
 * POST /api/events - Create a reminder for an event
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
    const { eventId, eventTitle, remindAt, customMessage } = body;

    if (!eventId || !eventTitle || !remindAt) {
      return NextResponse.json({ 
        error: 'Missing required fields: eventId, eventTitle, remindAt' 
      }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Get user's household and verify they have access to this event
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.household_id) {
      return NextResponse.json({ error: 'User not found or no household' }, { status: 404 });
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

  } catch (error) {
    console.error('[API/events] POST Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

