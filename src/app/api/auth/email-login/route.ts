/**
 * POST /api/auth/email-login
 * 
 * Request a magic link login via email.
 * User must have linked their email previously to use this.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateEmailLoginToken } from '@/lib/supabase';
import { sendLoginEmail } from '@/lib/email/send-email';

// Rate limit: 5 requests per minute per IP (with cleanup to prevent memory leak)
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_IP_ENTRIES = 10000; // Prevent unbounded growth

function cleanupRateLimits() {
    const now = Date.now();
    for (const [ip, data] of ipRateLimits) {
        if (data.resetAt < now) {
            ipRateLimits.delete(ip);
        }
    }
    // Hard cap if too many entries (defense against attack)
    if (ipRateLimits.size > MAX_IP_ENTRIES) {
        ipRateLimits.clear();
    }
}

export async function POST(request: NextRequest) {
    try {
        // Periodic cleanup (1% chance per request)
        if (Math.random() < 0.01) {
            cleanupRateLimits();
        }

        // IP-based rate limiting (defense in depth - email-tokens also has per-email limiting)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const now = Date.now();
        const ipLimit = ipRateLimits.get(ip);

        if (ipLimit && ipLimit.resetAt > now) {
            if (ipLimit.count >= 5) {
                return NextResponse.json(
                    { success: false, error: 'Too many requests. Please try again later.' },
                    { status: 429 }
                );
            }
            ipLimit.count++;
        } else {
            ipRateLimits.set(ip, { count: 1, resetAt: now + 60000 });
        }

        // Parse request
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Generate token (includes rate limiting per email)
        const tokenResult = await generateEmailLoginToken(email.toLowerCase().trim());

        if (!tokenResult.success || !tokenResult.link) {
            return NextResponse.json(
                { success: false, error: tokenResult.error || 'Failed to generate login link' },
                { status: 400 }
            );
        }

        // Send email
        const emailResult = await sendLoginEmail(email.toLowerCase().trim(), tokenResult.link);

        if (!emailResult.success) {
            return NextResponse.json(
                { success: false, error: emailResult.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        // Success - don't reveal if account exists or not
        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a login link has been sent.',
        });

    } catch (error) {
        console.error('[Email Login API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
