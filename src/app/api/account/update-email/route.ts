import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { sendVerificationEmail } from '@/lib/email/send-email';

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST - Initiate email address change
 * 
 * 1. Validates the new email isn't already in use
 * 2. Generates a verification token
 * 3. Stores pending email change with token
 * 4. Sends verification email via Resend
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const { email } = await request.json();

    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check if email is already in use by another user
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('linked_email', normalizedEmail)
      .neq('id', userId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use by another account' },
        { status: 409 }
      );
    }

    // Generate secure verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS).toISOString();

    // Store pending email change in email_login_tokens table (reusing existing table)
    // Delete any existing pending verification for this user first
    await admin
      .from('email_login_tokens')
      .delete()
      .eq('user_id', userId)
      .is('used_at', null);

    const { error: insertError } = await admin
      .from('email_login_tokens')
      .insert({
        token_hash: tokenHash,
        user_id: userId,
        email: normalizedEmail, // This is the NEW email to be verified
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('[update-email] Token insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create verification token' },
        { status: 500 }
      );
    }

    // Build verification link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyLink = `${baseUrl}/api/account/verify-email?token=${token}`;

    // Send verification email
    const emailResult = await sendVerificationEmail(normalizedEmail, verifyLink);

    if (!emailResult.success) {
      console.error('[update-email] Email send error:', emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send verification email' },
        { status: 500 }
      );
    }

    console.log(`[update-email] Verification email sent to: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox and click the link to confirm.',
    });
  } catch (error) {
    console.error('[update-email] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
