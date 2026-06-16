import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/supabase/db-users';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * POST - Fetch or create the current authenticated user's public.users record.
 */
export async function POST() {
  try {
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      logError('[API/user/me] Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;

    const user = await getDashboardUser(userId);
    if (user) {
      return NextResponse.json({ success: true, user });
    }

    logError('[API/user/me] User not found:', userId);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    logError('[API] /api/user/me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
