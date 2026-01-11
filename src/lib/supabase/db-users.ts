/**
 * User Database Operations
 * 
 * Primary pattern: Phone-first via WhatsApp/Telegram
 * Users are created when they first message us.
 */
import type { User, MessageChannel } from '@/types';
import { getAdminClient } from './client';

/**
 * Result of findOrCreateUser operation
 */
export interface FindOrCreateUserResult {
  user: User | null;
  isNewUser: boolean;
  error?: string; // Expose error for debugging
}

// ... (keep existing code until findOrCreateUserByEmail)

/**
 * Find or create user by Email (for email invites)
 */
export async function findOrCreateUserByEmail(
  email: string,
  displayName?: string
): Promise<FindOrCreateUserResult> {
  const admin = getAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Try to find existing user by linked_email
  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('linked_email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return { user: existing as User, isNewUser: false };
  }

  // 2. Create new user
  // We insert into 'linked_email' instead of 'email'
  // 'phone_number' is optional now (handled by DB constraint: check(phone OR linked_email))
  
  const { data: newUser, error } = await admin
    .from('users')
    .insert({
      linked_email: normalizedEmail,
      display_name: displayName,
      subscription_status: 'free',
      onboarding_source: 'email_invite',
      onboarding_modal_shown: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user by email:', error);
    return { user: null, isNewUser: false, error: error.message };
  }

  return { user: newUser as User, isNewUser: true };
}
