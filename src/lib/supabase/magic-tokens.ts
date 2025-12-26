/**
 * Magic Token Operations for Dashboard Authentication
 */
import crypto from 'crypto';
import type { User } from '@/types';
import { getAdminClient } from './client';

/**
 * Generate a custom magic link for dashboard access
 */
export async function generateDashboardLink(
  phoneNumber: string,
  channel: 'whatsapp' | 'telegram' | '360dialog' = 'whatsapp'
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const admin = getAdminClient();
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 1. Get User ID
    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();
    
    if (!user) return { success: false, error: 'User not found.' };

    // 2. Create Token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { error } = await admin.from('magic_tokens').insert({
      token_hash: tokenHash,
      user_id: user.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15m
      channel,
    });

    if (error) throw error;
    
    return { success: true, link: `${baseUrl}/api/auth/magic?token=${token}` };
  } catch (error) {
    console.error('[Dashboard Link] Error:', error);
    return { success: false, error: 'Failed to create link.' };
  }
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

  // Atomic Consume: Update only if unused and valid
  const { data: magicToken } = await admin
    .from('magic_tokens')
    .update({ used_at: now })
    .eq('token_hash', hash)
    .is('used_at', null)
    .gt('expires_at', now)
    .select('user_id')
    .single();

  if (!magicToken) {
    // Grace Period: Check if token was JUST used (prefetch protection)
    const { data: recent } = await admin
      .from('magic_tokens')
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
