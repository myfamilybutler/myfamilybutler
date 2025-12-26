import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase';

/**
 * GET - Verify email from link
 * 
 * Validates the token and updates the user's linked_email.
 * Redirects to settings page with success/error message.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=invalid_token`);
  }

  try {
    const admin = getAdminClient();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();

    // Find and consume the token atomically
    const { data: emailToken, error: tokenError } = await admin
      .from('email_login_tokens')
      .update({ used_at: now })
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', now)
      .select('user_id, email')
      .single();

    if (tokenError || !emailToken) {
      console.log('[verify-email] Invalid or expired token');
      return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=expired_token`);
    }

    // Update user's linked_email
    const { error: updateError } = await admin
      .from('users')
      .update({ linked_email: emailToken.email })
      .eq('id', emailToken.user_id);

    if (updateError) {
      console.error('[verify-email] Update error:', updateError);
      return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=update_failed`);
    }

    console.log(`[verify-email] Email verified for user ${emailToken.user_id}: ${emailToken.email}`);

    return NextResponse.redirect(`${baseUrl}/dashboard/settings?verified=true`);
  } catch (error) {
    console.error('[verify-email] Error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=server_error`);
  }
}
