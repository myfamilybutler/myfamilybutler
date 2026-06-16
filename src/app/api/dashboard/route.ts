import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/supabase/db-users';
import { getEventsForHousehold } from '@/lib/supabase/db-events';
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

    // 1. Fetch User Profile (create row from auth if missing)
    const user = await getDashboardUser(userId);
    if (!user) {
      log.error('[API/dashboard] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

      events = await getEventsForHousehold(user.household_id, startDate, endDate);
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
