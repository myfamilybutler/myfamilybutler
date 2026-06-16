import { cookies, headers } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';
import { logWarn } from '@/lib/utils/logger';

export interface ValidSession {
  userId: string;
  type: 'custom' | 'supabase';
}

/**
 * Validates the current request session.
 * Throws an error if no valid session is found.
 * 
 * Currently supports:
 * 1. Supabase Auth (Standard) - Checks headers and cookies
 * 2. Custom Session Cookies (Legacy/Magic Link/Telegram/WhatsApp)
 */
export async function validateSession(): Promise<ValidSession> {
  const cookieStore = await cookies();
  const headersList = await headers();

  // 1. SUPABASE AUTH CHECK (Priority)
  // Check for standard Supabase session via Authorization header or cookies
  const supabaseToken = headersList.get('authorization')?.replace('Bearer ', '');
  
  // If no header, check standard Supabase cookie (depends on project name, usually sb-<ref>-auth-token)
  // Since we don't know the exact ref, we might skip checking specific cookie names unless standard.
  // However, the client (browser) usually sends the token in the Authorization header if using Supabase Client.
  // Exception: Server Components/API routes called from browser navigation.
  
  if (supabaseToken) {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(supabaseToken);
    
    if (user && !error) {
      return {
        userId: user.id,
        type: 'supabase'
      };
    }
  }

  // 2. CUSTOM SESSION CHECK (Legacy/WhatsApp/Magic Link)
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
        logWarn(`[Auth] Failed impersonation attempt by ${sessionUserId.value}`);
      }
    }

    return {
      userId: sessionUserId.value,
      type: 'custom',
    };
  }

  throw new Error('Unauthorized: No valid session found');
}
