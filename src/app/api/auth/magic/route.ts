import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateMagicToken } from '@/lib/supabase';

/**
 * GET /api/auth/magic?token=xxx
 * 
 * Exchange a magic token for a session cookie.
 * This is the target URL sent to WhatsApp/Telegram users.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.redirect(
      new URL('/login?error=missing_token', request.url)
    );
  }
  
  // Validate token and get user
  const result = await validateMagicToken(token);
  
  if (!result) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_or_expired_token', request.url)
    );
  }
  
  const { userId, user } = result;
  
  // Set session cookie
  const cookieStore = await cookies();
  
  // Set our custom session cookie with user info
  cookieStore.set('session_authenticated', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
  
  // Store user ID in a separate cookie for middleware/APIs
  cookieStore.set('session_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
  
  // Optional: Store phone number for easy access
  if (user.phone_number) {
    cookieStore.set('session_phone', user.phone_number, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14, // 14 days
    });
  }
  
  console.log(`[Magic Auth] Session created for user ${userId}`);
  
  // Redirect to dashboard
  const dashboardUrl = new URL('/dashboard', request.url);
  return NextResponse.redirect(dashboardUrl);
}
