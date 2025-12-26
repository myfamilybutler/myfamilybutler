/**
 * POST /api/auth/send-verification
 * 
 * Manually triggers a verification email.
 * Uses Hybrid Bridge:
 * 1. Supabase Admin generates the secure link
 * 2. Resend delivers the branded email
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/client';
import { sendVerificationEmail } from '@/lib/email/send-email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        const supabaseAdmin = getAdminClient();

        // 1. Generate the link securely via Supabase
        // We use 'signup' type which works even if user exists (just updates confirmation)
        // We must provide a dummy password to satisfy TS, but it won't be used for existing users
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            password: 'dummy-password-not-used', 
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?verified=true`
            }
        });

        if (error) {
            console.error('[Verification API] Link generation error:', error);
            // Don't expose specific error (security)
            return NextResponse.json(
                { success: false, error: 'Failed to generate verification link' },
                { status: 500 }
            );
        }

        const verificationLink = data.properties?.action_link;

        if (!verificationLink) {
            console.error('[Verification API] No action_link returned');
            return NextResponse.json(
                { success: false, error: 'Failed to generate verification link' },
                { status: 500 }
            );
        }

        // 2. Send via Resend
        const emailResult = await sendVerificationEmail(email, verificationLink);

        if (!emailResult.success) {
            return NextResponse.json(
                { success: false, error: emailResult.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Verification API] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
