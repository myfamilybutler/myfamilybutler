import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PATHS = ['/dashboard', '/onboarding', '/invite/join'];
const PUBLIC_FILE_REGEX = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|webmanifest)$/;

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return false;
  if (PUBLIC_FILE_REGEX.test(pathname)) return false;
  return PROTECTED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
