import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logError } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    logError('[Auth Callback] exchangeCodeForSession failed:', error);

    // Provide a more specific error code when possible
    const errorCode =
      error.message?.toLowerCase().includes('pkce')
        ? 'pkce_error'
        : error.message?.toLowerCase().includes('verification')
          ? 'verification_failed'
          : 'invalid_or_expired';

    return NextResponse.redirect(`${origin}/login?error=${errorCode}`);
  }

  logError('[Auth Callback] Missing OAuth code in callback');
  return NextResponse.redirect(`${origin}/login?error=invalid_or_expired`);
}
