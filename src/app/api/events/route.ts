
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supabaseUserId = searchParams.get('supabaseUserId');

    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Missing supabaseUserId' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Get User & Household
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, household_id')
      .eq('supabase_user_id', supabaseUserId)
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
