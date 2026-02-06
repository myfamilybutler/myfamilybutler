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
