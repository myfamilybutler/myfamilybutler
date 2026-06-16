import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { ensureUserFromAuth } from '@/lib/supabase/db-users';
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
    const supabase = getAdminClient();

    // Try to fetch existing user
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: true, user: existingUser });
    }

    // Defensive fallback: create user row if trigger failed
    if (userError) {
      logError('[API/user/me] User not found, attempting to create from auth:', userError);

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !authUser?.user) {
        logError('[API/user/me] Auth user not found:', authError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const newUser = await ensureUserFromAuth(authUser.user);
      if (newUser) {
        return NextResponse.json({ success: true, user: newUser });
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    logError('[API] /api/user/me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
