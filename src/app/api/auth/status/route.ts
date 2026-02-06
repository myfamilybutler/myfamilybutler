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
        .select('id, display_name, household_id, is_household_admin, is_admin, linked_email, phone_number, onboarding_modal_shown, subscription_status, onboarding_source, email_verified, phone_verified')
        .eq('id', sessionUserId.value)
        .single();

      if (user && !error) {
        return NextResponse.json({
          authenticated: true,
          userId: user.id,
          user: user, // Return full DB user profile
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
