// ===========================================
// Supabase Client Configuration
// ===========================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, Message, Reminder, Event } from '@/types';
import crypto from 'crypto';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client singleton (lazy initialization)
let publicClient: SupabaseClient | null = null;

/**
 * Get public Supabase client (for client-side usage)
 * Uses lazy initialization to prevent build-time errors
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }
  
  if (!publicClient) {
    publicClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return publicClient;
}

// NOTE: Use getSupabase() for client-side usage. Direct export removed to prevent runtime errors.

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

// ===========================================
// Message Operations
// ===========================================
export async function logMessage(
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  type: 'text' | 'image' | 'voice' = 'text',
  messageId?: string,
  channel: 'whatsapp' | 'telegram' = 'whatsapp'
): Promise<Message | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('messages')
    .insert({
      user_id: userId,
      role,
      content,
      type,
      whatsapp_message_id: messageId,
      channel,
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
// Supabase Auth User Operations
// ===========================================
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

export async function checkOnboardingStatus(
  supabaseUserId: string
): Promise<{ completed: boolean; userId: string | null; householdId: string | null }> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('users')
    .select('id, onboarding_completed, household_id')
    .eq('supabase_user_id', supabaseUserId)
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
 * Accept an invite and join family.
 * Note: Without database transactions, partial failures can leave inconsistent state.
 */
export async function acceptInvite(
  userId: string,
  inviteId: string,
  familyId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error: inviteError } = await admin
    .from('household_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);
  
  if (inviteError) {
    console.error('Error accepting invite:', inviteError);
    return false;
  }
  
  const { error: userError } = await admin
    .from('users')
    .update({ household_id: familyId, is_admin: false })
    .eq('id', userId);
  
  if (userError) {
    // Log inconsistency - invite marked accepted but user not linked
    console.error('INCONSISTENCY: Invite accepted but user link failed', { inviteId, userId, familyId });
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

// ===========================================
// Dashboard Link Generation (Custom Tokens)
// ===========================================

/**
 * Generate a custom magic link for dashboard access.
 * 
 * This uses a clean custom token approach:
 * 1. Create a cryptographic token
 * 2. Store hash in magic_tokens table
 * 3. Return link with token
 * 4. Token is exchanged for session cookie at /api/auth/magic
 * 
 * NO proxy emails - cleaner architecture.
 */
export async function generateDashboardLink(
  phoneNumber: string,
  channel: 'whatsapp' | 'telegram' = 'whatsapp'
): Promise<{ success: boolean; link?: string; error?: string }> {
  const admin = getAdminClient();
  
  // Normalize phone number
  const normalizedPhone = phoneNumber.startsWith('+') 
    ? phoneNumber 
    : `+${phoneNumber}`;
  
  try {
    // 1. Find existing user by phone
    const { data: user, error: findError } = await admin
      .from('users')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();
    
    // Also try without + prefix
    let foundUser = user;
    if (!foundUser && !findError) {
      const altPhone = normalizedPhone.substring(1);
      const { data: altUser } = await admin
        .from('users')
        .select('*')
        .eq('phone_number', altPhone)
        .single();
      foundUser = altUser;
    }
    
    if (!foundUser) {
      return { success: false, error: 'User not found. Please send a message first to register.' };
    }
    
    // 2. For email-registered users with REAL email (not proxy), use native magic link
    // Skip this for messaging users - they should use custom tokens
    const hasRealEmail = foundUser.email && 
                         !foundUser.email.endsWith('@wa.myfamilybutler.com') &&
                         !foundUser.telegram_chat_id; // If they have telegram, use custom tokens
    
    if (foundUser.supabase_user_id && hasRealEmail && channel !== 'telegram' && channel !== 'whatsapp') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://myfamilybutler.com';
      console.log(`[Dashboard Link] Using Supabase Auth for ${foundUser.email}, redirect: ${appUrl}`);
      
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: foundUser.email,
        options: {
          redirectTo: `${appUrl}/dashboard`
        }
      });
      
      if (linkError) {
        console.error('[Dashboard Link] Error generating Supabase magic link:', linkError);
        return { success: false, error: 'Failed to generate link. Please try again.' };
      }
      
      return { success: true, link: linkData.properties.action_link };
    }
    
    // 3. Messaging-first user - create custom token (NO proxy emails!)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store token in database
    const { error: insertError } = await admin
      .from('magic_tokens')
      .insert({
        token_hash: tokenHash,
        user_id: foundUser.id,
        expires_at: expiresAt.toISOString(),
        channel: channel,
      });
    
    if (insertError) {
      console.error('[Dashboard Link] Error storing token:', insertError);
      return { success: false, error: 'Failed to create link. Please try again.' };
    }
    
    // 4. Generate link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/auth/magic?token=${token}`;
    
    console.log(`[Dashboard Link] Created token for ${normalizedPhone} (expires ${expiresAt.toISOString()})`);
    return { success: true, link: magicLink };
    
  } catch (error) {
    console.error('[Dashboard Link] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Validate and consume a magic token.
 * Returns the user if valid, null if invalid/expired.
 */
export async function validateMagicToken(
  token: string
): Promise<{ userId: string; user: User } | null> {
  const admin = getAdminClient();
  
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    console.log(`[Magic Token] Validating token, hash prefix: ${tokenHash.substring(0, 16)}...`);
    
    // ATOMIC: Find and mark token as used in a single operation
    // This prevents race conditions where two requests could both pass the "unused" check
    const { data: tokenRecords, error: updateError } = await admin
      .from('magic_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('used_at', null)  // Only update if not already used
      .gt('expires_at', new Date().toISOString())  // Only update if not expired
      .select('id, user_id, expires_at, used_at');
    
    // If no records updated, check why (already used, expired, or not found)
    if (updateError || !tokenRecords || tokenRecords.length === 0) {
      // Check if token exists but was already used (allow grace period for prefetch)
      const { data: existingToken } = await admin
        .from('magic_tokens')
        .select('id, user_id, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .single();
      
      if (existingToken?.used_at) {
        const usedAt = new Date(existingToken.used_at);
        const gracePeriod = 30 * 1000; // 30 seconds
        const now = new Date();
        
        if (now.getTime() - usedAt.getTime() <= gracePeriod) {
          console.log('[Magic Token] Token reused within grace period (prefetch handling)');
          // Allow reuse within grace period - get user
          const { data: user } = await admin
            .from('users')
            .select('*')
            .eq('id', existingToken.user_id)
            .single();
          
          if (user) {
            return { userId: user.id, user: user as User };
          }
        }
        console.log('[Magic Token] Token already used (outside grace period)');
      } else if (existingToken && new Date(existingToken.expires_at) < new Date()) {
        console.log('[Magic Token] Token expired');
      } else {
        console.log('[Magic Token] Token not found in database');
      }
      
      return null;
    }
    
    const tokenRecord = tokenRecords[0];
    console.log('[Magic Token] Token consumed successfully');
    
    // Get user
    const { data: user, error: userError } = await admin
      .from('users')
      .select('*')
      .eq('id', tokenRecord.user_id)
      .single();
    
    if (userError || !user) {
      console.log('[Magic Token] User not found');
      return null;
    }
    
    console.log(`[Magic Token] Valid token for user ${user.id}`);
    return { userId: user.id, user: user as User };
    
  } catch (error) {
    console.error('[Magic Token] Validation error:', error);
    return null;
  }
}

/**
 * Cleanup expired tokens (call periodically or via cron)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('magic_tokens')
    .delete()
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 1 day old
    .select('id');
  
  if (error) {
    console.error('[Magic Token] Cleanup error:', error);
    return 0;
  }
  
  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[Magic Token] Cleaned up ${count} expired tokens`);
  }
  
  return count;
}

