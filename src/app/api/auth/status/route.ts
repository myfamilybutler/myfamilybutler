import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findOrCreateUserBySupabaseId, getAdminClient } from '@/lib/supabase';

/**
 * GET /api/auth/status
 * 
 * Check authentication status - supports both Supabase and custom session cookies.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Check for our custom session cookie (for messaging users)
    const sessionAuth = cookieStore.get('session_authenticated');
    const sessionUserId = cookieStore.get('session_user_id');
    
    if (sessionAuth?.value === 'true' && sessionUserId?.value) {
      // Custom session - fetch user data
      const admin = getAdminClient();
      const { data: user, error } = await admin
        .from('users')
        .select('*')
        .eq('id', sessionUserId.value)
        .single();
      
      if (user && !error) {
        return NextResponse.json({
          authenticated: true,
          type: 'custom',
          userId: user.id,
          onboardingCompleted: user.onboarding_completed ?? true, // Messaging users are considered onboarded
        });
      }
    }
    
    // No valid session
    return NextResponse.json({
      authenticated: false,
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check session',
    });
  }
}

/**
 * POST /api/auth/status
 * 
 * Create/verify user from Supabase auth (legacy endpoint).
 */
export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId, email } = await request.json();
    
    if (!supabaseUserId || !email) {
      return NextResponse.json(
        { error: 'Missing supabaseUserId or email' },
        { status: 400 }
      );
    }
    
    // Find or create user in Supabase
    const user = await findOrCreateUserBySupabaseId(supabaseUserId, email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to find or create user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      userId: user.id,
      onboardingCompleted: user.onboarding_completed ?? false,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
