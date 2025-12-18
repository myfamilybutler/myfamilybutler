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

  if (sessionAuth?.value === 'true' && sessionUserId?.value) {
    // Validate UUID format to prevent injection
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionUserId.value);
    if (!isUuid) {
      throw new Error('Invalid session: Malformed User ID');
    }

    return {
      userId: sessionUserId.value,
      type: 'custom',
    };
  }

  throw new Error('Unauthorized: No valid session found');
}
