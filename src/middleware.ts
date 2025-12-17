import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Paths to protect
  const protectedPaths = ['/dashboard'];
  
  const isProtectedPath = protectedPaths.some((path) => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    const sessionDetail = request.cookies.get('session_authenticated');
    
    // If no session cookie, redirect to login
    if (!sessionDetail) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login pages)
     * - onboarding (onboarding pages - debatable, but leaving open for now or could protect too)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|onboarding).*)',
  ],
};
