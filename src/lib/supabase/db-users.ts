/**
 * User Database Operations
 */
import type { User } from '@/types';
import { getAdminClient } from './client';

/**
 * Find or create user by phone number (for messaging apps)
 */
export async function findOrCreateUser(phoneNumber: string): Promise<User | null> {
  const admin = getAdminClient();
  const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  
  // 1. Try to find existing user
  const { data: existing } = await admin
    .from('users')
    .select('*')
    .eq('phone_number', normalized)
    .maybeSingle();
  
  if (existing) return existing as User;
  
  // 2. Create new (UNIQUE constraint on phone_number prevents duplicates)
  const { data: newUser, error } = await admin
    .from('users')
    .insert({ phone_number: normalized, subscription_status: 'free' })
    .select()
    .single();
  
  // 3. Race condition: another request created user first
  if (error?.code === '23505') {
    const { data } = await admin.from('users').select('*').eq('phone_number', normalized).single();
    return data as User | null;
  }
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  return newUser as User;
}

/**
 * Find or create user by Supabase Auth ID (for email/OAuth users)
 */
export async function findOrCreateUserBySupabaseId(
  supabaseUserId: string,
  email: string
): Promise<User | null> {
  const admin = getAdminClient();
  
  // Try to find existing user by supabase_user_id
  const { data: existingUser, error: findError } = await admin
    .from('users')
    .select('*')
    .eq('supabase_user_id', supabaseUserId)
    .single();
  
  if (existingUser && !findError) {
    return existingUser as User;
  }
  
  // Check if user exists by email (migration case)
  const { data: emailUser } = await admin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (emailUser) {
    // Update existing user with supabase_user_id
    const { data: updatedUser, error: updateError } = await admin
      .from('users')
      .update({ supabase_user_id: supabaseUserId })
      .eq('id', emailUser.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user with supabase_user_id:', updateError);
      return emailUser as User;
    }
    
    return updatedUser as User;
  }
  
  // Create new user
  const { data: newUser, error: createError } = await admin
    .from('users')
    .insert({ 
      email: email,
      supabase_user_id: supabaseUserId,
      subscription_status: 'free',
      onboarding_completed: false,
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating user:', createError);
    return null;
  }
  
  return newUser as User;
}

/**
 * Update user's onboarding status
 */
export async function updateOnboardingCompleted(
  supabaseUserId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('users')
    .update({ onboarding_completed: true })
    .eq('supabase_user_id', supabaseUserId);
  
  if (error) {
    console.error('Error updating onboarding status:', error);
    return false;
  }
  
  return true;
}
