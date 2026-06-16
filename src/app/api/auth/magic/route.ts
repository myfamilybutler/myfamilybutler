import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateMagicToken } from '@/lib/supabase/magic-tokens';
import { ensureAuthUserMatchesPublicUser } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * GET /api/auth/magic?token=...
 *
 * Redeems a dashboard magic token generated for WhatsApp/Telegram users.
 * If the user has a linked email, we generate a Supabase Auth magic link
 * and redirect the browser through Supabase's verification flow so a
 * proper session is established.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=missing_token`);
  }

  try {
    const result = await validateMagicToken(token);

    if (!result) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?error=invalid_or_expired_token`);
    }

    const { user } = result;
    const supabase = await createClient();

    // Users who signed up with email can use Supabase Auth's magic-link flow.
    if (user.linked_email) {
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
        logError('[Magic] Failed to generate auth link:', error);
        return NextResponse.redirect(`${request.nextUrl.origin}/login?error=auth_link_failed`);
      }

      return NextResponse.redirect(data.properties.action_link);
    }

    // Phone-only users must use OTP-based login; redirect them with context.
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=email_required_for_magic_link`);
  } catch (error) {
    logError('[Magic] Redemption error:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=auth_error`);
  }
}
