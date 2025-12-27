/**
 * POST /api/auth/logout
 * 
 * Clears session cookies to log user out.
 * Supports session invalidation for security.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { log } from '@/lib/utils/logger';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Get user ID before clearing for logging
    const userId = cookieStore.get('session_user_id')?.value;
    
    // Clear all session cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0, // Expire immediately
    };

    cookieStore.set('session_authenticated', '', cookieOptions);
    cookieStore.set('session_user_id', '', cookieOptions);

    if (userId) {
      log.info('[Logout] Session cleared for user:', userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    log.error('[Logout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

// GET method for simple logout links (e.g., from emails)
export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    };

    cookieStore.set('session_authenticated', '', cookieOptions);
    cookieStore.set('session_user_id', '', cookieOptions);

    // Redirect to home page after logout
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    
  } catch {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}
