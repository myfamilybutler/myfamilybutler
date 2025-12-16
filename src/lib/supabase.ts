// ===========================================
// Supabase Client Configuration
// ===========================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, Message, Reminder } from '@/types';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Public client (for client-side usage)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client singleton
let adminClient: SupabaseClient | null = null;

// Admin client (for server-side usage with elevated privileges)
export function getAdminClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  if (!adminClient) {
    adminClient = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return adminClient;
}

// ===========================================
// User Operations
// ===========================================
export async function findOrCreateUser(phoneNumber: string): Promise<User | null> {
  const admin = getAdminClient();
  
  // Try to find existing user
  const { data: existingUser, error: findError } = await admin
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (existingUser && !findError) {
    return existingUser as User;
  }
  
  // Create new user
  const { data: newUser, error: createError } = await admin
    .from('users')
    .insert({ 
      phone_number: phoneNumber,
      subscription_status: 'free'
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating user:', createError);
    return null;
  }
  
  return newUser as User;
}

// ===========================================
// Message Operations
// ===========================================
export async function logMessage(
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  type: 'text' | 'image' | 'voice' = 'text',
  whatsappMessageId?: string
): Promise<Message | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('messages')
    .insert({
      user_id: userId,
      role,
      content,
      type,
      whatsapp_message_id: whatsappMessageId,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error logging message:', error);
    return null;
  }
  
  return data as Message;
}

export async function getMessageHistory(
  userId: string,
  limit: number = 20
): Promise<Message[]> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching message history:', error);
    return [];
  }
  
  // Return in chronological order (oldest first)
  return (data?.reverse() ?? []) as Message[];
}

// ===========================================
// Reminder Operations
// ===========================================
export async function createReminder(
  userId: string,
  message: string,
  remindAt: Date
): Promise<Reminder | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('reminders')
    .insert({
      user_id: userId,
      message,
      remind_at: remindAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating reminder:', error);
    return null;
  }
  
  return data as Reminder;
}

export async function getPendingReminders(): Promise<(Reminder & { users: User })[]> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('reminders')
    .select('*, users(*)')
    .eq('status', 'pending')
    .lte('remind_at', new Date().toISOString());
  
  if (error) {
    console.error('Error fetching pending reminders:', error);
    return [];
  }
  
  return (data ?? []) as (Reminder & { users: User })[];
}

export async function updateReminderStatus(
  reminderId: string,
  status: 'sent' | 'failed' | 'cancelled'
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('reminders')
    .update({ status })
    .eq('id', reminderId);
  
  if (error) {
    console.error('Error updating reminder status:', error);
    return false;
  }
  
  return true;
}

// ===========================================
// Firebase Auth User Operations
// ===========================================
export async function findOrCreateUserByFirebaseUid(
  firebaseUid: string,
  phoneNumber: string
): Promise<User | null> {
  const admin = getAdminClient();
  
  // Try to find existing user by firebase_uid
  const { data: existingUser, error: findError } = await admin
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .single();
  
  if (existingUser && !findError) {
    return existingUser as User;
  }
  
  // Check if user exists by phone number (migration case)
  const { data: phoneUser } = await admin
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (phoneUser) {
    // Update existing user with firebase_uid
    const { data: updatedUser, error: updateError } = await admin
      .from('users')
      .update({ firebase_uid: firebaseUid })
      .eq('id', phoneUser.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user with firebase_uid:', updateError);
      return phoneUser as User;
    }
    
    return updatedUser as User;
  }
  
  // Create new user
  const { data: newUser, error: createError } = await admin
    .from('users')
    .insert({ 
      phone_number: phoneNumber,
      firebase_uid: firebaseUid,
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

export async function updateOnboardingCompleted(
  firebaseUid: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('users')
    .update({ onboarding_completed: true })
    .eq('firebase_uid', firebaseUid);
  
  if (error) {
    console.error('Error updating onboarding status:', error);
    return false;
  }
  
  return true;
}

export async function checkOnboardingStatus(
  firebaseUid: string
): Promise<{ completed: boolean; userId: string | null }> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('users')
    .select('id, onboarding_completed')
    .eq('firebase_uid', firebaseUid)
    .single();
  
  if (error || !data) {
    return { completed: false, userId: null };
  }
  
  return { 
    completed: data.onboarding_completed ?? false, 
    userId: data.id 
  };
}

