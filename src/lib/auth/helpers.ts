import { createClient } from '@/lib/supabase/server';

export interface ValidSession {
  userId: string;
}

/**
 * Validates the current request session using native Supabase Auth.
 * Throws an error if no valid session is found.
 */
export async function validateSession(): Promise<ValidSession> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized: No valid session found');
  }

  return { userId: user.id };
}
