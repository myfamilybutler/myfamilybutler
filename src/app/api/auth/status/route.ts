import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';

/**
 * GET /api/auth/status
 * 
 * Check authentication status using cookie-based session.
 * Primary auth method for WhatsApp/email magic link users.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    // Check for session cookie
    const sessionAuth = cookieStore.get('session_authenticated');
    const sessionUserId = cookieStore.get('session_user_id');

    if (sessionAuth?.value === 'true' && sessionUserId?.value) {
      // Fetch user data
      const admin = getAdminClient();
      const { data: user, error } = await admin
        .from('users')
        .select('*')
        .eq('id', sessionUserId.value)
        .single();

      if (user && !error) {
        return NextResponse.json({
          authenticated: true,
          userId: user.id,
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
