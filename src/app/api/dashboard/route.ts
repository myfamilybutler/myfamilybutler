import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth-helpers';

/**
 * GET /api/dashboard
 * 
 * Consolidated endpoint that returns user profile and events in one request.
 * Reduces latency by ~50% compared to two sequential calls.
 */
export async function GET() {
  try {
    // SECURITY: Enforce session validation
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      console.error('[API/dashboard] Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const supabase = getAdminClient();

    // 1. Fetch User Profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[API/dashboard] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch Events (if user has household)
    let events: unknown[] = [];
    if (user.household_id) {
      const { data: eventData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('household_id', user.household_id)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (eventsError) {
        console.error('[API/dashboard] Events fetch error:', eventsError);
        // Don't fail the whole request, just return empty events
      } else {
        events = eventData || [];
      }
    }

    return NextResponse.json({
      success: true,
      user,
      events,
    });

  } catch (error) {
    console.error('[API/dashboard] Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
