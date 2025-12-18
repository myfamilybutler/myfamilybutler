import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  // Paths to protect
  const protectedPaths = ['/dashboard', '/onboarding'];
  
  const isProtectedPath = protectedPaths.some((path) => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    // Check for Supabase session cookie
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    
    // Also check for our custom session cookie as fallback
    const sessionDetail = request.cookies.get('session_authenticated');
    
    // Debug logging
    console.log(`[Middleware] Path: ${request.nextUrl.pathname}, session_authenticated: ${sessionDetail?.value || 'none'}, accessToken: ${!!accessToken}`);
    
    // If no session cookies, redirect to login
    if (!accessToken && !refreshToken && !sessionDetail) {
      console.log(`[Middleware] No session found, redirecting to login`);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // If we have tokens, verify with Supabase (optional - for SSR validation)
    if (accessToken) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          }
        );
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          // Token is invalid, redirect to login
          const loginUrl = new URL('/login', request.url);
          return NextResponse.redirect(loginUrl);
        }
      } catch {
        // If verification fails, still allow through if we have session_authenticated
        if (!sessionDetail) {
          const loginUrl = new URL('/login', request.url);
          return NextResponse.redirect(loginUrl);
        }
      }
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
     * - register (register pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
