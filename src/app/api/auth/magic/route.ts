import { NextRequest, NextResponse } from 'next/server';
import { validateMagicToken } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?error=missing', request.url));

  const session = await validateMagicToken(token);
  if (!session) return NextResponse.redirect(new URL('/login?error=invalid', request.url));

  // Create session
  const res = NextResponse.redirect(new URL('/dashboard', request.url));
  
  // Set Cookies
  const opts = { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'lax' as const, 
    path: '/', 
    maxAge: 1209600 // 14 days
  };
  
  res.cookies.set('session_authenticated', 'true', opts);
  res.cookies.set('session_user_id', session.userId, opts);
  
  return res;
}
