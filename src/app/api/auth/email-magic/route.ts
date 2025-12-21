/**
 * GET /api/auth/email-magic?token=xxx
 * 
 * Validate email magic link token and create session.
 * Similar to WhatsApp magic link but for email-based login.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateEmailLoginToken } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
    }

    const session = await validateEmailLoginToken(token);

    if (!session) {
        return NextResponse.redirect(new URL('/login?error=invalid_or_expired', request.url));
    }

    // Create session (same as WhatsApp magic link)
    const res = NextResponse.redirect(new URL('/dashboard', request.url));

    // Set cookies - 60 day session for email login
    const opts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 24 * 60 * 60 // 60 days (longer for email users)
    };

    res.cookies.set('session_authenticated', 'true', opts);
    res.cookies.set('session_user_id', session.userId, opts);

    console.log(`[Email Magic] Session created for user: ${session.userId}`);

    return res;
}
