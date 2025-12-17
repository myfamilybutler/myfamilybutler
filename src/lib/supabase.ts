// ===========================================
// Supabase Client Configuration
// ===========================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, Message, Reminder, Event } from '@/types';

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
  let { data: existingUser } = await admin
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  // If not found, try alternative format (with/without +)
  if (!existingUser) {
    const altPhone = phoneNumber.startsWith('+') 
      ? phoneNumber.substring(1) 
      : `+${phoneNumber}`;
      
    const { data: altUser } = await admin
      .from('users')
      .select('*')
      .eq('phone_number', altPhone)
      .single();
      
    if (altUser) {
      existingUser = altUser;
    }
  }

  if (existingUser) {
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
// Event Operations
// ===========================================

export async function createEvent(
  householdId: string,
  createdBy: string,
  eventData: {
    title: string;
    event_date: string;
    event_time?: string;
    end_time?: string;
    is_all_day: boolean;
    family_member?: string;
    location?: string;
    description?: string;
    source_message_id?: string;
  }
): Promise<Event | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('events')
    .insert({
      household_id: householdId,
      created_by: createdBy,
      title: eventData.title,
      event_date: eventData.event_date,
      event_time: eventData.event_time || null,
      end_time: eventData.end_time || null,
      is_all_day: eventData.is_all_day,
      family_member: eventData.family_member || null,
      location: eventData.location || null,
      description: eventData.description || null,
      source_message_id: eventData.source_message_id || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    return null;
  }
  
  return data as Event;
}

export async function getEventsForHousehold(
  householdId: string,
  startDate?: string,
  endDate?: string
): Promise<Event[]> {
  const admin = getAdminClient();
  
  let query = admin
    .from('events')
    .select('*')
    .eq('household_id', householdId)
    .order('event_date', { ascending: true });
  
  if (startDate) {
    query = query.gte('event_date', startDate);
  }
  
  if (endDate) {
    query = query.lte('event_date', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return (data ?? []) as Event[];
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
): Promise<{ completed: boolean; userId: string | null; householdId: string | null }> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('users')
    .select('id, onboarding_completed, household_id')
    .eq('firebase_uid', firebaseUid)
    .single();
  
  if (error || !data) {
    return { completed: false, userId: null, householdId: null };
  }
  
  return { 
    completed: data.onboarding_completed ?? false, 
    userId: data.id,
    householdId: data.household_id ?? null
  };
}

// ===========================================
// Family Operations
// ===========================================

/**
 * Create a new family and set user as admin
 */
export async function createFamilyForUser(
  userId: string,
  displayName?: string
): Promise<string | null> {
  const admin = getAdminClient();
  
  // Create family with auto-generated name
  const familyName = displayName ? `${displayName}'s Family` : null;
  
  const { data: household, error: createError } = await admin
    .from('households')
    .insert({ name: familyName })
    .select()
    .single();
  
  if (createError || !household) {
    console.error('Error creating family:', createError);
    return null;
  }
  
  // Update user to be admin of this family
  const { error: updateError } = await admin
    .from('users')
    .update({ 
      household_id: household.id,
      is_admin: true,
      display_name: displayName
    })
    .eq('id', userId);
  
  if (updateError) {
    console.error('Error linking user to family:', updateError);
    return null;
  }
  
  return household.id;
}

/**
 * Check if there's a pending invite for this phone number
 */
export async function checkPendingInvite(
  phoneNumber: string
): Promise<{ householdId: string; inviteId: string } | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('household_invites')
    .select('id, household_id')
    .eq('phone_number', phoneNumber)
    .eq('status', 'pending')
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return { householdId: data.household_id, inviteId: data.id };
}

/**
 * Accept an invite and join family
 */
export async function acceptInvite(
  userId: string,
  inviteId: string,
  familyId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  // Update invite status
  const { error: inviteError } = await admin
    .from('household_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);
  
  if (inviteError) {
    console.error('Error accepting invite:', inviteError);
    return false;
  }
  
  // Link user to family
  const { error: userError } = await admin
    .from('users')
    .update({ household_id: familyId, is_admin: false })
    .eq('id', userId);
  
  if (userError) {
    console.error('Error linking user to family:', userError);
    return false;
  }
  
  return true;
}

/**
 * Create an invite for a phone number
 */
export async function createFamilyInvite(
  familyId: string,
  phoneNumber: string,
  invitedBy: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  // Check if user already exists and is in another household
  const { data: existingUser } = await admin
    .from('users')
    .select('household_id')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (existingUser?.household_id) {
    console.error('User already belongs to a family');
    return false;
  }
  
  // Check if invite already exists
  const { data: existingInvite } = await admin
    .from('household_invites')
    .select('id')
    .eq('household_id', familyId)
    .eq('phone_number', phoneNumber)
    .eq('status', 'pending')
    .single();
  
  if (existingInvite) {
    // Already invited
    return true;
  }
  
  const { error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      phone_number: phoneNumber,
      invited_by: invitedBy,
      status: 'pending'
    });
  
  if (error) {
    console.error('Error creating invite:', error);
    return false;
  }
  
  return true;
}

/**
 * Add a family member (non-WhatsApp person)
 */
export async function addFamilyMember(
  familyId: string,
  name: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('family_members')
    .insert({
      household_id: familyId,
      name
    });
  
  if (error) {
    console.error('Error adding family member:', error);
    return false;
  }
  
  return true;
}

/**
 * Get all members of a family (both users and family members)
 */
export async function getFamilyMembers(
  familyId: string
): Promise<{ users: Array<{ id: string; display_name?: string; phone_number: string; is_admin: boolean }>; familyMembers: Array<{ id: string; name: string }> }> {
  const admin = getAdminClient();
  
  // Get users in family
  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, display_name, phone_number, is_admin')
    .eq('household_id', familyId);
  
  if (usersError) {
    console.error('Error fetching family users:', usersError);
  }
  
  // Get family members
  const { data: familyMembers, error: membersError } = await admin
    .from('family_members')
    .select('id, name')
    .eq('household_id', familyId);
  
  if (membersError) {
    console.error('Error fetching family members:', membersError);
  }
  
  return {
    users: users ?? [],
    familyMembers: familyMembers ?? []
  };
}

/**
 * Get pending invites for a family
 */
export async function getPendingInvites(
  familyId: string
): Promise<Array<{ id: string; phone_number: string; created_at: string }>> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('household_invites')
    .select('id, phone_number, created_at')
    .eq('household_id', familyId)
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error fetching pending invites:', error);
    return [];
  }
  
  return data ?? [];
}
