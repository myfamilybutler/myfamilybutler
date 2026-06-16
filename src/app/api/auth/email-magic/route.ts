import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateEmailLoginToken } from '@/lib/supabase/email-tokens';
import { ensureAuthUserMatchesPublicUser } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * GET /api/auth/email-magic?token=...
 *
 * Redeems an email login token. When valid, we generate a Supabase Auth
 * magic link for the stored email and redirect through Supabase's
 * verification flow to establish a proper session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=missing_token`);
  }

  try {
    const result = await validateEmailLoginToken(token);

    if (!result) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=invalid_or_expired_token`);
    }

    const { user } = result;
    const supabase = await createClient();

    if (!user.linked_email) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=email_not_linked`);
    }

    const authUserReady = await ensureAuthUserMatchesPublicUser(user.id, user.linked_email);
    if (!authUserReady) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=auth_link_failed`);
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.linked_email,
      options: {
        redirectTo: `${request.nextUrl.origin}/dashboard`,
      },
    });

    if (error || !data.properties?.action_link) {
      logError('[Email Magic] Failed to generate auth link:', error);
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=auth_link_failed`);
    }

    return NextResponse.redirect(data.properties.action_link);
  } catch (error) {
    logError('[Email Magic] Redemption error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=auth_error`);
  }
}
