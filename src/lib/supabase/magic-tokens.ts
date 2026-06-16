/**
 * Magic Token Operations for Dashboard Authentication
 */
import crypto from 'crypto';
import type { User } from '@/types';
import { getAdminClient } from './client';
import { normalizePhone, findUserByIdentifier } from './identity';
import { logError } from '@/lib/utils/logger';

async function createMagicTokenForUser(
  userId: string,
  channel: 'whatsapp' | 'telegram' | '360dialog'
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const admin = getAdminClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { error } = await admin.from('magic_tokens').insert({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      channel,
    });

    if (error) {
      // Backward compatibility for databases that still enforce
      // channel IN ('whatsapp','telegram') on magic_tokens.
      if (channel === '360dialog' && error.code === '23514') {
        const retry = await admin.from('magic_tokens').insert({
          token_hash: tokenHash,
          user_id: userId,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          channel: 'whatsapp',
        });

        if (retry.error) {
          throw retry.error;
        }
      } else {
        throw error;
      }
    }

    return { success: true, link: `${baseUrl}/api/auth/magic?token=${token}` };
  } catch (error) {
    logError('[Dashboard Link] Error:', error);
    return { success: false, error: 'Failed to create link.' };
  }
}

/**
 * Generate a custom magic link for dashboard access
 */
export async function generateDashboardLink(
  phoneNumber: string,
  channel: 'whatsapp' | 'telegram' | '360dialog' = 'whatsapp'
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const normalizedPhone = normalizePhone(phoneNumber);

    if (!normalizedPhone) {
      return { success: false, error: 'Invalid phone number format.' };
    }

    // 1. Get User using unified identity resolution
    const user = await findUserByIdentifier({ phone: normalizedPhone });
    
    if (!user) return { success: false, error: 'User not found.' };

    // 2. Create Token
    return createMagicTokenForUser(user.id, channel);
  } catch (error) {
    logError('[Dashboard Link] Error:', error);
    return { success: false, error: 'Failed to create link.' };
  }
}

/**
 * Generate a dashboard link directly from a resolved user ID.
 */
export async function generateDashboardLinkForUser(
  userId: string,
  channel: 'whatsapp' | 'telegram' | '360dialog' = 'whatsapp'
): Promise<{ success: boolean; link?: string; error?: string }> {
  return createMagicTokenForUser(userId, channel);
}

/**
 * Validate and consume a magic token
 * ATOMIC OPERATION: Consumes token in DB. Returns null if invalid, expired, or used.
 */
export async function validateMagicToken(
  token: string
): Promise<{ userId: string; user: User } | null> {
  const admin = getAdminClient();
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const now = new Date().toISOString();

  // Atomic Consume: Update only if unused and valid. If no row is updated,
  // the token is invalid, expired, or already used.
  const { data: magicToken, error: consumeError } = await admin
    .from('magic_tokens')
    .update({ used_at: now })
    .eq('token_hash', hash)
    .is('used_at', null)
    .gt('expires_at', now)
    .select('user_id')
    .single();

  if (consumeError || !magicToken) {
    logError('[Magic Token] Token already used, invalid, or expired:', consumeError?.message ?? 'no row updated');
    return null;
  }

  // Retrieve full user details
  const { data: user } = await admin
    .from('users')
    .select('*')
    .eq('id', magicToken.user_id)
    .single();

  return user ? { userId: user.id, user: user as User } : null;
}

/**
 * Cleanup expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const { count } = await getAdminClient()
    .from('magic_tokens')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date(Date.now() - 86400000).toISOString()); // 24h
  return count || 0;
}
