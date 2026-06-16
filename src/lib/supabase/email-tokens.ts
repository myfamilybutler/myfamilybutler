/**
 * Email Login Tokens - Magic link authentication via email
 * 
 * Uses the same token pattern as WhatsApp magic tokens but for email-based login.
 * This allows users who have linked their email to login via magic link.
 */
import crypto from 'crypto';
import type { User } from '@/types';
import { getAdminClient } from './client';
import { findUserByIdentifier } from './identity';
import { log, logError } from '@/lib/utils/logger';

const EMAIL_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes (email delays)
const EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const EMAIL_RATE_LIMIT_MAX = 3; // Max 3 emails per minute per email

/**
 * Generate an email login token and return the magic link
 * Rate-limited to prevent abuse
 */
export async function generateEmailLoginToken(
    email: string
): Promise<{ success: boolean; link?: string; user?: User; error?: string }> {
    const admin = getAdminClient();
    const normalizedEmail = email.toLowerCase().trim();
    // Force localhost in development to avoid env var mishaps
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://myfamilybutler.com');

    // 1. Find user by email using unified identity resolution
    const user = await findUserByIdentifier({ email: normalizedEmail });

    if (!user) {
        // Improved error message with actionable suggestion
        log.info(`[Email Token] No user found with email: ${normalizedEmail}`);
        return { 
            success: false, 
            error: 'Kein Account mit dieser Email gefunden. Starte mit WhatsApp oder verknüpfe deine Email in den Einstellungen.' 
        };
    }

    // 2. Rate limiting: Atomic check in DB to avoid race conditions
    const nowIso = new Date().toISOString();
    const { data: rateLimitResult, error: rateLimitError } = await admin.rpc('check_rate_limit', {
        p_key: `email_login:${normalizedEmail}`,
        p_window_ms: EMAIL_RATE_LIMIT_WINDOW_MS,
        p_max_count: EMAIL_RATE_LIMIT_MAX,
        p_now: nowIso,
    });

    if (rateLimitError) {
        logError('[Email Token] Rate limit RPC error:', rateLimitError);
        return { success: false, error: 'Rate limiting unavailable. Please try again in a minute.' };
    }

    const allowed = Array.isArray(rateLimitResult)
      ? Boolean(rateLimitResult[0]?.allowed)
      : false;

    if (!allowed) {
        log.info(`[Email Token] Rate limit exceeded for: ${normalizedEmail}`);
        return { success: false, error: 'Too many requests. Please wait a minute.' };
    }

    // 3. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_EXPIRY_MS).toISOString();

    // 4. Store token
    const { error: insertError } = await admin
        .from('email_login_tokens')
        .insert({
            token_hash: tokenHash,
            user_id: user.id,
            email: normalizedEmail,
            expires_at: expiresAt,
        });

    if (insertError) {
        logError('[Email Token] Error storing token:', insertError);
        return { success: false, error: 'Failed to create login link' };
    }

    const link = `${baseUrl}/api/auth/email-magic?token=${token}`;

    return {
        success: true,
        link,
        user: user as User
    };
}

/**
 * Validate and consume an email login token
 * ATOMIC OPERATION: Token is marked as used in same query to prevent race conditions
 */
export async function validateEmailLoginToken(
    token: string
): Promise<{ userId: string; user: User } | null> {
    const admin = getAdminClient();
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();

    // Atomic consume: Update only if unused and not expired, return user_id
    const { data: emailToken } = await admin
        .from('email_login_tokens')
        .update({ used_at: now })
        .eq('token_hash', hash)
        .is('used_at', null)
        .gt('expires_at', now)
        .select('user_id')
        .single();

    if (!emailToken) {
        // Grace Period: Check if token was JUST used (browser prefetch protection)
        const { data: recent } = await admin
            .from('email_login_tokens')
            .select('user_id, used_at')
            .eq('token_hash', hash)
            .single();

        if (recent?.used_at && (Date.now() - new Date(recent.used_at).getTime() < 30000)) {
            // Allow reuse within 30s window
            const { data: user } = await admin.from('users').select('*').eq('id', recent.user_id).single();
            return user ? { userId: user.id, user: user as User } : null;
        }

        return null;
    }

    // Retrieve full user details
    const { data: user } = await admin
        .from('users')
        .select('*')
        .eq('id', emailToken.user_id)
        .single();

    return user ? { userId: user.id, user: user as User } : null;
}

/**
 * Cleanup expired email tokens (run periodically)
 */
export async function cleanupExpiredEmailTokens(): Promise<number> {
    const { count } = await getAdminClient()
        .from('email_login_tokens')
        .delete({ count: 'exact' })
        .lt('expires_at', new Date(Date.now() - 86400000).toISOString()); // 24h ago

    return count || 0;
}
