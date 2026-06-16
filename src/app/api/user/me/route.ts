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

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return NextResponse.json({ success: true, user: existingUser });
    }

    logError('[API/user/me] User not found, attempting to create from auth:', userId);

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
  } catch (error) {
    logError('[API] /api/user/me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
