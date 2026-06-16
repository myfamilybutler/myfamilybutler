import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/client';
import { logError } from '@/lib/utils/logger';
import { isAllowedForwardedHost, sanitizeNextPath } from '@/lib/auth/validation';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.user) {
      // Determine whether the user already has a household.
      // Only allow relative internal redirects to prevent open-redirect attacks.
      const nextParam = searchParams.get('next');
      let redirectTo = sanitizeNextPath(nextParam);
      try {
        const admin = getAdminClient();
        const { data: dbUser } = await admin
          .from('users')
          .select('household_id')
          .eq('id', sessionData.user.id)
          .maybeSingle();

        if (!dbUser?.household_id) {
          // If the OAuth flow was started from an invite link, send the user
          // back to that invite so they can accept it rather than forcing
          // them to create a new household on onboarding.
          redirectTo = redirectTo.startsWith('/invite/')
            ? redirectTo
            : '/onboarding';
        }
      } catch (err) {
        logError('[Auth Callback] Failed to look up user household:', err);
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      // SECURITY: validate X-Forwarded-Host against an allow-list before using it
      // to prevent open redirects. Fall back to the request origin if disallowed.
      const safeForwardedHost = forwardedHost && isAllowedForwardedHost(forwardedHost)
        ? forwardedHost
        : null;

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      } else if (safeForwardedHost) {
        return NextResponse.redirect(`https://${safeForwardedHost}${redirectTo}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }

    logError('[Auth Callback] exchangeCodeForSession failed:', error);

    const errorCode = error
      ? error.message?.toLowerCase().includes('pkce')
        ? 'pkce_error'
        : error.message?.toLowerCase().includes('verification')
          ? 'verification_failed'
          : 'invalid_or_expired'
      : 'invalid_or_expired';

    return NextResponse.redirect(`${origin}/login?error=${errorCode}`);
  }

  logError('[Auth Callback] Missing OAuth code in callback');
  return NextResponse.redirect(`${origin}/login?error=invalid_or_expired`);
}
