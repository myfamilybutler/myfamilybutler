import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { log, logError } from '@/lib/utils/logger';

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

    log.info('[verify-email] Looking for token hash:', tokenHash.substring(0, 16) + '...');
    log.info('[verify-email] Current time:', now);

    // First, check if token exists at all (for debugging)
    const { data: allTokens } = await admin
      .from('email_login_tokens')
      .select('token_hash, user_id, email, expires_at, used_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    log.info('[verify-email] Recent tokens in DB:', allTokens?.map(t => ({
      hash: t.token_hash?.substring(0, 16) + '...',
      email: t.email,
      expires_at: t.expires_at,
      used_at: t.used_at,
    })));

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
      log.info('[verify-email] Token lookup failed:', { tokenError, emailToken });
      return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=expired_token`);
    }

    // Update user's linked_email and mark as verified
    const { error: updateError } = await admin
      .from('users')
      .update({ linked_email: emailToken.email, email_verified: true })
      .eq('id', emailToken.user_id);

    if (updateError) {
      logError('[verify-email] Update error:', updateError);
      return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=update_failed`);
    }

    log.info(`[verify-email] Email verified for user ${emailToken.user_id}: ${emailToken.email}`);

    return NextResponse.redirect(`${baseUrl}/dashboard/settings?verified=true`);
  } catch (error) {
    logError('[verify-email] Error:', error);
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=server_error`);
  }
}
