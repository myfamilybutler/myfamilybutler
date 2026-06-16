import { NextResponse, type NextRequest } from 'next/server';

// Temporarily disabled while debugging 500 errors on static assets.
// Session refresh is handled by the auth callback and client-side auth state.
export async function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
