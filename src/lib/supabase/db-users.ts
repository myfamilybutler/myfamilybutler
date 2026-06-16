/**
 * User Database Operations
 * 
 * Primary pattern: Phone-first via WhatsApp/Telegram
 * Users are created when they first message us.
 */
import type { User, MessageChannel } from '@/types';
import { getAdminClient } from './client';
import { logError } from '@/lib/utils/logger';

/**
 * Result of findOrCreateUser operation
 */
export interface FindOrCreateUserResult {
  user: User | null;
  isNewUser: boolean;
  error?: string; // Expose error for debugging
}

/**
 * Find or create user by phone number (for messaging apps)
 * This is the PRIMARY way users are created in the phone-first architecture.
 * 
 * @param phoneNumber - The phone number to find or create user for
 * @param channel - The channel (whatsapp/telegram) for tracking source
 * @returns User object and whether this was a new user (for welcome message)
 */
export async function findOrCreateUser(
  phoneNumber: string,
  channel: MessageChannel = 'whatsapp'
): Promise<FindOrCreateUserResult> {
  const admin = getAdminClient();
  const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  // 1. Try to find existing user (single query)
  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('phone_number', normalized)
    .maybeSingle();

  if (existing) {
    return { user: existing as User, isNewUser: false };
  }

  // 2. Create new user with onboarding_source
  const { data: newUser, error } = await admin
    .from('users')
    .insert({
      phone_number: normalized,
      subscription_status: 'free',
      onboarding_source: channel,
      onboarding_modal_shown: false,
    })
    .select()
    .single();

  // 3. Handle race condition: another request created user first
  if (error?.code === '23505') {
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('phone_number', normalized)
      .single();
    return { user: data as User | null, isNewUser: false };
  }

  if (error) {
    logError('Error creating user:', error);
    return { user: null, isNewUser: false, error: error.message };
  }

  // Note: Analytics tracking is done in webhook/pipeline layer to avoid client bundle issues
  return { user: newUser as User, isNewUser: true };
}

/**
 * Find user by ID
 */
export async function findUserById(userId: string): Promise<User | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as User;
}

/**
 * Ensure a public.users row exists for a Supabase Auth user.
 * This is a defensive fallback in case the auth trigger fails or is missing.
 */
export async function ensureUserFromAuth(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string };
}): Promise<User | null> {
  const admin = getAdminClient();

  // 1. Try to find existing user
  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existing) {
    return existing as User;
  }

  // 2. Create user row
  const { data: newUser, error } = await admin
    .from('users')
    .insert({
      id: authUser.id,
      linked_email: authUser.email ?? null,
      display_name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        'User',
      subscription_status: 'free',
      onboarding_source: 'web',
      email_verified: !!authUser.email,
      onboarding_modal_shown: false,
    })
    .select()
    .single();

  if (error?.code === '23505') {
    // Race condition: another request created the user
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    return data as User | null;
  }

  if (error) {
    logError('Error ensuring user from auth:', error);
    return null;
  }

  return newUser as User;
}

/**
 * Update user's display name
 */
export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<boolean> {
  const admin = getAdminClient();

  const { error } = await admin
    .from('users')
    .update({ display_name: displayName })
    .eq('id', userId);

  if (error) {
    logError('Error updating display name:', error);
    return false;
  }

  return true;
}

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

  // 3. Handle race condition: another request created user first
  if (error?.code === '23505') {
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('linked_email', normalizedEmail)
      .single();
    return { user: data as User | null, isNewUser: false };
  }

  if (error) {
    logError('Error creating user by email:', error);
    return { user: null, isNewUser: false, error: error.message };
  }

  return { user: newUser as User, isNewUser: true };
}
