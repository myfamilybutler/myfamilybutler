import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { ensureUserFromAuth } from '@/lib/supabase/db-users';
import { getEventsForHousehold, hydrateEventsWithFamilyMembers } from '@/lib/supabase/db-events';
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
    // SECURITY: explicit minimal column list; avoid SELECT *.
    let { data: user } = await supabase
      .from('users')
      .select(
        'id, display_name, phone_number, household_id, is_household_admin, onboarding_completed, onboarding_modal_shown, identity_linked_at, linked_email, email_verified, phone_verified, telegram_chat_id, whatsapp_verified, is_admin'
      )
      .eq('id', userId)
      .single();

    if (!user) {
      log.warn('[API/dashboard] User row missing, creating from auth session:', userId);

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !authUser?.user) {
        log.error('[API/dashboard] Auth user not found:', authError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const created = await ensureUserFromAuth(authUser.user);

      if (!created) {
        log.error('[API/dashboard] Failed to create missing user row:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Re-fetch with the explicit minimal column list so the returned payload
      // matches the shape consumed by the dashboard UI.
      const { data: refetched } = await supabase
        .from('users')
        .select(
          'id, display_name, phone_number, household_id, is_household_admin, onboarding_completed, onboarding_modal_shown, identity_linked_at, linked_email, email_verified, phone_verified, telegram_chat_id, whatsapp_verified, is_admin'
        )
        .eq('id', userId)
        .single();

      if (!refetched) {
        log.error('[API/dashboard] Failed to refetch created user row:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      user = refetched;
    }

    // 2. Fetch Events (if user has household)
    // Bound the query to a reasonable window to avoid loading the entire history.
    let events: unknown[] = [];
    if (user.household_id) {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
        .toISOString()
        .split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 6, 0)
        .toISOString()
        .split('T')[0];

      const rawEvents = await getEventsForHousehold(user.household_id, startDate, endDate);
      events = await hydrateEventsWithFamilyMembers(rawEvents, user.household_id);
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
