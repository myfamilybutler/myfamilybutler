import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('[Proxy] Session update failed:', error);
    // Return the original request unchanged so the app can still render.
    // A missing session refresh is better than a 500 error.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
