import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { log } from '@/lib/utils/logger';

const PROTECTED_PATHS = ['/dashboard', '/onboarding'];

/** Helper to create login redirect */
const redirectToLogin = (request: NextRequest) => 
  NextResponse.redirect(new URL('/login', request.url));

export async function proxy(request: NextRequest) {
  const isProtectedPath = PROTECTED_PATHS.some((path) => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Get session indicators
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;
  const sessionDetail = request.cookies.get('session_authenticated');

  log.debug(`[Proxy] Path: ${request.nextUrl.pathname}, session_authenticated: ${sessionDetail?.value ?? 'none'}, accessToken: ${!!accessToken}`);

  // Quick check: any session indicator present?
  const hasAnySession = accessToken || refreshToken || sessionDetail;
  if (!hasAnySession) {
    log.debug('[Proxy] No session found, redirecting to login');
    return redirectToLogin(request);
  }

  // Verify Supabase token if present
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
      
      // Token invalid - fallback to session cookie or redirect
      if (error || !user) {
        return sessionDetail ? NextResponse.next() : redirectToLogin(request);
      }
    } catch {
      // Verification failed - fallback to session cookie or redirect
      if (!sessionDetail) {
        return redirectToLogin(request);
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

