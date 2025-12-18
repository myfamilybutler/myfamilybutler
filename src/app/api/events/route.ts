
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth-helpers';

export async function GET(_request: NextRequest) {
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
