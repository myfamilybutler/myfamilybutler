import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/client';
import { logError } from '@/lib/utils/logger';
import { headers } from 'next/headers';

export interface ValidSession {
  userId: string;
}

/**
 * Validates the current request session using native Supabase Auth.
 * Throws an error if no valid session is found.
 */
export async function validateSession(): Promise<ValidSession> {
  let token: string | undefined;
  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  } catch {
    // Ignore errors when headers() is called outside request context
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Unauthorized: No valid session found');
  }

  return { userId: user.id };
}

/**
 * Ensure the Supabase Auth user exists with the same UUID as the public.users
 * row. This prevents magic-link/email-login flows from creating a brand-new
 * auth user with a different UUID and orphaning the original account.
 */
export async function ensureAuthUserMatchesPublicUser(
  publicUserId: string,
  email: string
): Promise<boolean> {
  const admin = getAdminClient();

  try {
    const { data: existing, error: getError } = await admin.auth.admin.getUserById(publicUserId);

    if (existing?.user) {
      return true;
    }

    // getUserById returns an error when the user does not exist; that is expected.
    if (getError && !getError.message?.toLowerCase().includes('not found')) {
      logError('[ensureAuthUser] Unexpected error looking up auth user:', getError);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      id: publicUserId,
      email,
      email_confirm: true,
    });

    if (createError || !created.user) {
      logError('[ensureAuthUser] Failed to create auth user:', createError);
      return false;
    }

    return true;
  } catch (error) {
    logError('[ensureAuthUser] Unexpected exception:', error);
    return false;
  }
}
