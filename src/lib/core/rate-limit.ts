/**
 * Rate Limiting with Atomic Operations
 * 
 * Uses database-level atomic operations to prevent race conditions.
 * Implements proper check-and-increment with conflict handling.
 */

import { getAdminClient } from '@/lib/supabase';
import { logError } from '@/lib/utils/logger';

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
      logError('[RateLimit] RPC error:', error);
      // Fail open - allow request if we can't check rate limit
      return true;
    }

    if (Array.isArray(data)) {
      const first = data[0] as { allowed?: boolean } | undefined;
      if (typeof first?.allowed === 'boolean') {
        return first.allowed;
      }
      return true;
    }

    if (data && typeof data === 'object' && 'allowed' in data) {
      const single = data as { allowed?: boolean };
      if (typeof single.allowed === 'boolean') {
        return single.allowed;
      }
    }

    return true;
  } catch (err) {
    logError('[RateLimit] Error:', err);
    // Fail open on error
    return true;
  }
}
