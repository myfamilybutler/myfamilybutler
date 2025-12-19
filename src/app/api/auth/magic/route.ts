import { NextRequest, NextResponse } from 'next/server';
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
  
  const { userId } = result;
  
  console.log(`[Magic Auth] Session created for user ${userId}`);
  
  // Create redirect response
  const dashboardUrl = new URL('/dashboard', request.url);
  const response = NextResponse.redirect(dashboardUrl);
  
  // Set cookies on the response object (this is the correct way!)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 14, // 14 days
  };
  
  response.cookies.set('session_authenticated', 'true', cookieOptions);
  response.cookies.set('session_user_id', userId, cookieOptions);
  
  return response;
}
