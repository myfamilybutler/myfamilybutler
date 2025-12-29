/**
 * Family Database Operations
 */
import { getAdminClient } from './client';
// Use Node's crypto for secure token generation
import { randomUUID } from 'crypto';

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
    return true; // Already invited
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
 * Edit a family member's name and/or color
 */
export async function editFamilyMember(
  memberId: string,
  name: string,
  familyId: string,
  color?: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const updateData: { name: string; color?: string } = { name };
  if (color) {
    updateData.color = color;
  }
  
  const { error } = await admin
    .from('family_members')
    .update(updateData)
    .eq('id', memberId)
    .eq('household_id', familyId); // Security: ensure member belongs to user's family
  
  if (error) {
    console.error('Error editing family member:', error);
    return false;
  }
  
  return true;
}

/**
 * Delete a family member
 */
export async function deleteFamilyMember(
  memberId: string,
  familyId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('family_members')
    .delete()
    .eq('id', memberId)
    .eq('household_id', familyId); // Security: ensure member belongs to user's family
  
  if (error) {
    console.error('Error deleting family member:', error);
    return false;
  }
  
  return true;
}

/**
 * Get all members of a family (both users and family members)
 */
export async function getFamilyMembers(
  familyId: string
): Promise<{ users: Array<{ id: string; display_name?: string; phone_number: string; is_admin: boolean }>; familyMembers: Array<{ id: string; name: string; color?: string }> }> {
  const admin = getAdminClient();
  
  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, display_name, phone_number, is_admin')
    .eq('household_id', familyId);
  
  if (usersError) {
    console.error('Error fetching family users:', usersError);
  }
  
  const { data: familyMembers, error: membersError } = await admin
    .from('family_members')
    .select('id, name, color')
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

/**
 * Get invite by Token (supports both QR code and Email token)
 */
export async function getInviteByToken(
  token: string
): Promise<{ householdId: string; inviteId: string; invitedBy: string } | null> {
  const admin = getAdminClient();
  
  // 1. Try to find by explicit token column (Email invites)
  const { data: tokenInvite } = await admin
    .from('household_invites')
    .select('id, household_id, invited_by, expires_at')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (tokenInvite) {
     // Check expiration
     if (tokenInvite.expires_at && new Date(tokenInvite.expires_at) < new Date()) {
         return null; 
     }

     return { 
        householdId: tokenInvite.household_id, 
        inviteId: tokenInvite.id,
        invitedBy: tokenInvite.invited_by
      };
  }

  // 2. Fallback: Try QR code format (stored in phone_number)
  const qrPhoneNumber = `qr:${token}`;
  const { data, error } = await admin
    .from('household_invites')
    .select('id, household_id, invited_by')
    .eq('phone_number', qrPhoneNumber)
    .eq('status', 'pending')
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return { 
    householdId: data.household_id, 
    inviteId: data.id,
    invitedBy: data.invited_by
  };
}

/**
 * Create an email invite
 * Returns the invite ID to be used as a token
 */
export async function createEmailInvite(
  familyId: string,
  email: string,
  invitedBy: string
): Promise<string | null> {
  const admin = getAdminClient();
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if invite already exists
  const { data: existingInvite } = await admin
    .from('household_invites')
    .select('id, token')
    .eq('household_id', familyId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .filter('expires_at', 'gt', new Date().toISOString()) // Only valid invites
    .single();
  
  if (existingInvite?.token) {
    return existingInvite.token;
  }
  
  // Create secure token and expiration
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const { data, error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      email: normalizedEmail,
      invited_by: invitedBy,
      status: 'pending',
      token: token,
      expires_at: expiresAt.toISOString(),
      // Backward compatibility: store in phone_number but with email prefix, 
      // or we can make phone_number nullable in schema update.
      // For now, let's just make sure phone_number constraint doesn't fail if we upgraded schema
      // but if we didn't migrate old constraints, we might need a dummy value.
      // Based on our migration, we have a check constraint (phone OR email).
      // So we can leave phone_number null if the migration ran.
    })
    .select('token')
    .single();
  
  if (error || !data) {
    console.error('Error creating email invite:', error);
    return null;
  }
  
  return data.token;
}

/**
 * Get invite by ID (Legacy/Fallback)
 */
export async function getInviteById(
  inviteId: string
): Promise<{ householdId: string; inviteId: string; invitedBy: string } | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('household_invites')
    .select('id, household_id, invited_by, expires_at')
    .eq('id', inviteId)
    .eq('status', 'pending')
    .single();
  
  if (error || !data) {
    console.error('Error fetching invite by ID:', error);
    return null;
  }

  // Check expiration if present
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
  }
  
  return { 
    householdId: data.household_id, 
    inviteId: data.id,
    invitedBy: data.invited_by
  };
}
