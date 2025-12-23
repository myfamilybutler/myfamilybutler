import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { pullFromGoogle } from '@/lib/sync/google-sync-service';
import { findUserById } from '@/lib/supabase/db-users';

/**
 * POST /api/calendar/sync
 * 
 * Triggers a sync pull from Google Calendar.
 * Called when dashboard loads to get latest Google Calendar changes.
 */
export async function POST() {
  try {
    // Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's household
    const user = await findUserById(session.userId);
    if (!user?.household_id) {
      return NextResponse.json({ 
        success: true, 
        message: 'No household found, skipping sync' 
      });
    }

    // Pull from Google Calendar
    const result = await pullFromGoogle(session.userId, user.household_id);

    return NextResponse.json({
      success: result.success,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      linked: result.linked,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('[Calendar Sync API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Google Calendar' },
      { status: 500 }
    );
  }
}
