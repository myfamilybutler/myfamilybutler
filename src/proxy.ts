import { NextResponse, type NextRequest } from 'next/server';

// Minimal proxy: pass through all requests without any processing.
// This overrides any stale Edge Function from previous deployments.
export async function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
