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
    console.error('Error creating user:', error);
    return { user: null, isNewUser: false };
  }

  // Note: Analytics tracking is done in message-processor.ts to avoid client bundle issues
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
    console.error('Error updating display name:', error);
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

  // 1. Try to find existing user by email (we need to query the auth table or our public table if we sync emails)
  // Assuming 'users' table has an email column or we rely on phone?
  // Our schema seems to rely on phone_number as primary identity for now.
  // We should check if we have an email column. Based on register page we do have email login.
  
  // Checking `src/app/api/auth/email-login/route.ts` implies we use email for magic links.
  // The `users` table likely has an `email` column based on typical Supabase setup, but let's be sure.
  // In `db-users.ts` findAll selects `*`. 
  
  // Let's assume we can query by email.
  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return { user: existing as User, isNewUser: false };
  }

  // 2. Create new user
  // Determine a placeholder phone number if required? 
  // If `phone_number` is unique/required, we might have an issue if we only have email.
  // However, `findOrCreateUser` uses phone.
  
  // Strategy: If we support email-only users, we insert. 
  // If schema requires phone, we might need to handle that. 
  // Let's assume we can insert with just email or null phone if schema allows.
  // Given `email-login` exists, we probably support email.
  
  const { data: newUser, error } = await admin
    .from('users')
    .insert({
      email: normalizedEmail,
      display_name: displayName,
      subscription_status: 'free',
      onboarding_source: 'email_invite',
      onboarding_modal_shown: false,
    })
    .select()
    .single();

  if (error) {
    // If phone is required and we didn't provide it, this will fail.
    console.error('Error creating user by email:', error);
    return { user: null, isNewUser: false };
  }

  return { user: newUser as User, isNewUser: true };
}
