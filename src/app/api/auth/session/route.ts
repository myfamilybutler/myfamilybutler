import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // In a real app with firebase-admin, you would verify the ID Token sent in the body.
  // For now, we trust the client-side verification flow and set a session cookie.
  
  const cookieStore = await cookies();
  
  // Set a session cookie that expires in 1 week
  cookieStore.set('session_authenticated', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return NextResponse.json({ success: true });
}
