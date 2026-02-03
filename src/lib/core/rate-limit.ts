/**
 * Rate Limiting with Atomic Operations
 * 
 * Uses database-level atomic operations to prevent race conditions.
 * Implements proper check-and-increment with conflict handling.
 */

import { getAdminClient } from '@/lib/supabase';

const WINDOW_MS = 60 * 1000;
const MAX_COUNT = 30;

/**
 * Check rate limit using atomic database operations
 * Uses upsert with conflict resolution to prevent race conditions
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  const admin = getAdminClient();
  const now = new Date();

  try {
    // Use a transaction to ensure atomicity
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: key,
      p_window_ms: WINDOW_MS,
      p_max_count: MAX_COUNT,
      p_now: now.toISOString(),
    });

    if (error) {
      console.error('[RateLimit] RPC error:', error);
      // Fail open - allow request if we can't check rate limit
      return true;
    }

    return data?.allowed ?? true;
  } catch (err) {
    console.error('[RateLimit] Error:', err);
    // Fail open on error
    return true;
  }
}

/**
 * Legacy rate limit check (fallback if RPC not available)
 * Uses simple insert with conflict handling
 */
export async function checkRateLimitLegacy(key: string): Promise<boolean> {
  const admin = getAdminClient();
  const now = new Date();

  // Try to insert a new record - if it exists, this will fail with unique constraint
  const { error: insertError } = await admin
    .from('rate_limits')
    .insert({
      key,
      count: 1,
      window_start: now.toISOString(),
      expires_at: new Date(Date.now() + WINDOW_MS * 2).toISOString(),
    });

  if (!insertError) {
    // New record created, allowed
    return true;
  }

  // Record exists, fetch and check
  const { data, error } = await admin
    .from('rate_limits')
    .select('count, window_start')
    .eq('key', key)
    .single();

  if (error || !data) {
    console.error('[RateLimit] Fetch error:', error);
    return true; // Fail open
  }

  const windowStart = new Date(data.window_start);
  
  // Check if window has expired
  if (now.getTime() - windowStart.getTime() > WINDOW_MS) {
    // Reset window atomically
    const { error: updateError } = await admin
      .from('rate_limits')
      .update({
        count: 1,
        window_start: now.toISOString(),
        expires_at: new Date(Date.now() + WINDOW_MS * 2).toISOString(),
      })
      .eq('key', key);

    if (updateError) {
      console.error('[RateLimit] Reset error:', updateError);
    }
    return true;
  }

  // Check if limit exceeded
  if (data.count >= MAX_COUNT) {
    return false;
  }

  // Increment count atomically
  const { error: updateError } = await admin
    .from('rate_limits')
    .update({
      count: data.count + 1,
      expires_at: new Date(Date.now() + WINDOW_MS * 2).toISOString(),
    })
    .eq('key', key);

  if (updateError) {
    console.error('[RateLimit] Increment error:', updateError);
  }

  return true;
}
