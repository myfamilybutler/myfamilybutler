import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { ensureUserFromAuth } from '@/lib/supabase/db-users';
import { validateSession } from '@/lib/auth/helpers';
import { log } from '@/lib/utils/logger';

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
      log.error('[API/dashboard] Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const supabase = getAdminClient();

    // 1. Fetch User Profile
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Defensive fallback: create user row if trigger failed
    if (!user) {
      log.warn('[API/dashboard] User row missing, creating from auth session:', userId);

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !authUser?.user) {
        log.error('[API/dashboard] Auth user not found:', authError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      user = await ensureUserFromAuth(authUser.user);

      if (!user) {
        log.error('[API/dashboard] Failed to create missing user row:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
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
        log.error('[API/dashboard] Events fetch error:', eventsError);
        // Don't fail the whole request, just return empty events
      } else {
        const rawEvents = eventData || [];
        const memberIds = Array.from(
          new Set(
            rawEvents
              .map((event) => event.family_member_id as string | null | undefined)
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        );

        if (memberIds.length > 0) {
          const { data: memberRows, error: membersError } = await supabase
            .from('family_members')
            .select('id, name')
            .eq('household_id', user.household_id)
            .in('id', memberIds);

          if (membersError) {
            log.error('[API/dashboard] Family member lookup failed:', membersError);
            events = rawEvents;
          } else {
            const nameById = new Map((memberRows || []).map((member) => [member.id, member.name]));
            events = rawEvents.map((event) => ({
              ...event,
              family_member: event.family_member_id
                ? nameById.get(event.family_member_id) || event.family_member
                : event.family_member,
            }));
          }
        } else {
          events = rawEvents;
        }
      }
    }

    return NextResponse.json({
      success: true,
      user,
      events,
    });

  } catch (error) {
    log.error('[API/dashboard] Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
