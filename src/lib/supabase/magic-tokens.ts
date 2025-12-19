/**
 * Magic Token Operations for Dashboard Authentication
 * 
 * Flow:
 * 1. User sends "dashboard" to WhatsApp/Telegram
 * 2. generateDashboardLink() creates token, stores hash in DB
 * 3. User clicks link → /api/auth/magic validates token
 * 4. Session cookies set, user logged into dashboard
 */
import crypto from 'crypto';
import type { User } from '@/types';
import { getAdminClient } from './client';

/**
 * Generate a custom magic link for dashboard access
 */
export async function generateDashboardLink(
  phoneNumber: string,
  channel: 'whatsapp' | 'telegram' = 'whatsapp'
): Promise<{ success: boolean; link?: string; error?: string }> {
  const admin = getAdminClient();
  
  // Normalize phone number - always store with +
  const normalizedPhone = phoneNumber.startsWith('+') 
    ? phoneNumber 
    : `+${phoneNumber}`;
  
  try {
    // Find user by phone number
    const { data: user } = await admin
      .from('users')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    if (!user) {
      return { success: false, error: 'User not found. Please send a message first to register.' };
    }
    
    // Create custom magic token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store token in database
    const { error: insertError } = await admin
      .from('magic_tokens')
      .insert({
        token_hash: tokenHash,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        channel: channel,
      });
    
    if (insertError) {
      console.error('[Dashboard Link] Error storing token:', insertError);
      return { success: false, error: 'Failed to create link. Please try again.' };
    }
    
    // Generate link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/auth/magic?token=${token}`;
    
    console.log(`[Dashboard Link] Created token for ${normalizedPhone}`);
    return { success: true, link: magicLink };
    
  } catch (error) {
    console.error('[Dashboard Link] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Validate and consume a magic token
 * Returns the user if valid, null if invalid/expired
 */
export async function validateMagicToken(
  token: string
): Promise<{ userId: string; user: User } | null> {
  const admin = getAdminClient();
  
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    console.log(`[Magic Token] Validating token, hash prefix: ${tokenHash.substring(0, 16)}...`);
    
    // ATOMIC: Find and mark token as used in a single operation
    const { data: tokenRecords, error: updateError } = await admin
      .from('magic_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('id, user_id, expires_at, used_at');
    
    if (updateError || !tokenRecords || tokenRecords.length === 0) {
      // Check if token exists but was already used (grace period for prefetch)
      const { data: existingToken } = await admin
        .from('magic_tokens')
        .select('id, user_id, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .single();
      
      if (existingToken?.used_at) {
        const usedAt = new Date(existingToken.used_at);
        const gracePeriod = 30 * 1000; // 30 seconds
        const now = new Date();
        
        if (now.getTime() - usedAt.getTime() <= gracePeriod) {
          console.log('[Magic Token] Token reused within grace period');
          const { data: user } = await admin
            .from('users')
            .select('*')
            .eq('id', existingToken.user_id)
            .single();
          
          if (user) {
            return { userId: user.id, user: user as User };
          }
        }
        console.log('[Magic Token] Token already used (outside grace period)');
      } else if (existingToken && new Date(existingToken.expires_at) < new Date()) {
        console.log('[Magic Token] Token expired');
      } else {
        console.log('[Magic Token] Token not found');
      }
      
      return null;
    }
    
    const tokenRecord = tokenRecords[0];
    console.log('[Magic Token] Token consumed successfully');
    
    // Get user
    const { data: user, error: userError } = await admin
      .from('users')
      .select('*')
      .eq('id', tokenRecord.user_id)
      .single();
    
    if (userError || !user) {
      console.log('[Magic Token] User not found');
      return null;
    }
    
    console.log(`[Magic Token] Valid token for user ${user.id}`);
    return { userId: user.id, user: user as User };
    
  } catch (error) {
    console.error('[Magic Token] Validation error:', error);
    return null;
  }
}

/**
 * Cleanup expired tokens (call periodically or via cron)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('magic_tokens')
    .delete()
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .select('id');
  
  if (error) {
    console.error('[Magic Token] Cleanup error:', error);
    return 0;
  }
  
  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[Magic Token] Cleaned up ${count} expired tokens`);
  }
  
  return count;
}
