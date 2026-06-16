import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * GET - Fetch user by supabaseUserId (for login flow)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabaseUserId = searchParams.get('supabaseUserId');
    
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Missing supabaseUserId' }, { status: 400 });
    }
    
    const supabase = getAdminClient();
    
    // Fetch user by supabase_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, supabase_user_id')
      .eq('supabase_user_id', supabaseUserId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found', user: null }, { status: 200 });
    }
    
    return NextResponse.json({ success: true, user });
    
  } catch (error) {
    logError('[API] /api/user/me GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // SECURITY: Validate session first.
    let session;
    try {
      session = await validateSession();
    } catch (error) {
      logError('[API/user/me] Auth failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const supabase = getAdminClient();

    // 1. Fetch Verified User
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logError('[API/user/me] User not found for session:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Handle Merging Strategy (Secure)
    // Only allow merging if we are in a specific secure context (e.g. Supabase Auth)
    // For now, "Custom Session" implies we are already logged in as a specific user.
    // If we want to merge, it needs a more complex flow (e.g. "Link Account" page with OTP).
    // The "Self-Healing" via simple POST is too dangerous (ATO risk).
    // We REMOVE the blind "phone/email" linking here. 
    
    // However, if the user has NO Supabase ID yet, and they are currently authenticated via Supabase (Auth Header),
    // we could link them. But `validateSession` prefers Cookies.
    
    // For this Security Hardening pass, we simply RETURN the verified user.
    // Explicit merging should be a separate, explicit user action, not a side-effect.

    return NextResponse.json({ success: true, user });
    
  } catch (error) {
    logError('[API] /api/user/me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
