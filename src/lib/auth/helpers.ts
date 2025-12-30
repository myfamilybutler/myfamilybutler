import { cookies } from 'next/headers';

export interface ValidSession {
  userId: string;
  type: 'custom';
}

/**
 * Validates the current request session.
 * Throws an error if no valid session is found.
 * 
 * Currently supports:
 * - Custom Session Cookies (from Magic Link / Telegram / WhatsApp)
 * 
 * NOTE: Supabase Auth (Email/Google/Facebook) requires middleware setup
 * with @supabase/ssr. That flow bypasses this function and uses 
 * Supabase's built-in session handling.
 */
export async function validateSession(): Promise<ValidSession> {
  const cookieStore = await cookies();
  
  // Check Custom Session Cookies (Secure, HttpOnly)
  const sessionAuth = cookieStore.get('session_authenticated');
  const sessionUserId = cookieStore.get('session_user_id');
  const sessionImpersonateId = cookieStore.get('impersonate_id');

  if (sessionAuth?.value === 'true' && sessionUserId?.value) {
    // Validate UUID format to prevent injection
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionUserId.value);
    if (!isUuid) {
      throw new Error('Invalid session: Malformed User ID');
    }

    // IMPERSONATION CHECK
    // Only perform DB check if impersonation cookie exists
    if (sessionImpersonateId?.value) {
      // Lazy import to avoid circular dependencies if any
      const { getAdminClient } = await import('@/lib/supabase');
      const admin = getAdminClient();

      // Verify REAL user is actually an admin
      const { data: realUser } = await admin
        .from('users')
        .select('is_admin')
        .eq('id', sessionUserId.value)
        .single();

      if (realUser?.is_admin) {
        return {
          userId: sessionImpersonateId.value,
          type: 'custom',
        };
      } else {
        // Validation failed - someone trying to hack impersonation?
        // Fallback to real user, ignore fake cookie
        console.warn(`[Auth] Failed impersonation attempt by ${sessionUserId.value}`);
      }
    }

    return {
      userId: sessionUserId.value,
      type: 'custom',
    };
  }

  throw new Error('Unauthorized: No valid session found');
}
