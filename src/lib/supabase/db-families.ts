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
  
  // Update user to be household admin of this family
  const { error: updateError } = await admin
    .from('users')
    .update({ 
      household_id: household.id,
      is_household_admin: true,  // Household owner, NOT super admin
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
 * 
 * ATOMIC-ISH: Executes both updates in parallel and rolls back invite
 * status if user update fails to maintain consistency.
 */
export async function acceptInvite(
  userId: string,
  inviteId: string,
  familyId: string
): Promise<boolean> {
  const admin = getAdminClient();
  
  // Use atomic RPC transaction instead of fragile client-side logic
  const { data, error } = await admin.rpc('accept_household_invite', {
    p_user_id: userId,
    p_invite_id: inviteId,
    p_household_id: familyId
  });
  
  if (error) {
    console.error('Error accepting invite (RPC):', error);
    return false;
  }
  
  return data === true;
}

/**
 * Create an Open Invite (Link only, no specific user)
 * Returns the invite token
 */
export async function createOpenInvite(
  familyId: string,
  invitedBy: string,
  expiresInDays: number = 7
): Promise<string | null> {
  const admin = getAdminClient();
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      invited_by: invitedBy,
      status: 'pending',
      token: token,
      expires_at: expiresAt.toISOString(),
      // No email or phone_number
    })
    .select('token')
    .single();

  if (error || !data) {
    console.error('Error creating open invite:', error);
    return null;
  }

  return data.token;
}

/**
 * Create an invite for a phone number
 * Returns the token so it can be shared manually if needed
 */
export async function createFamilyInvite(
  familyId: string,
  phoneNumber: string,
  invitedBy: string
): Promise<string | null> {
  const admin = getAdminClient();
  
  // Check if user already exists and is in another household
  const { data: existingUser } = await admin
    .from('users')
    .select('household_id')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (existingUser?.household_id) {
    console.error('User already belongs to a family');
    return null;
  }
  
  // Check if invite already exists
  const { data: existingInvite } = await admin
    .from('household_invites')
    .select('id, token')
    .eq('household_id', familyId)
    .eq('phone_number', phoneNumber)
    .eq('status', 'pending')
    .single();
  
  if (existingInvite?.token) {
    return existingInvite.token;
  }
  
  // Generate secure token
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { data, error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      phone_number: phoneNumber,
      invited_by: invitedBy,
      status: 'pending',
      token: token,
      expires_at: expiresAt.toISOString()
    })
    .select('token')
    .single();
  
  if (error || !data) {
    console.error('Error creating invite:', error);
    return null;
  }
  
  return data.token;
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
): Promise<{ users: Array<{ id: string; display_name?: string; phone_number: string; is_household_admin: boolean }>; familyMembers: Array<{ id: string; name: string; color?: string }> }> {
  const admin = getAdminClient();
  
  // Parallel fetch: users and family members at the same time
  const [usersResult, membersResult] = await Promise.all([
    admin
      .from('users')
      .select('id, display_name, phone_number, is_household_admin')
      .eq('household_id', familyId),
    admin
      .from('family_members')
      .select('id, name, color')
      .eq('household_id', familyId),
  ]);
  
  if (usersResult.error) {
    console.error('Error fetching family users:', usersResult.error);
  }
  
  if (membersResult.error) {
    console.error('Error fetching family members:', membersResult.error);
  }
  
  return {
    users: usersResult.data ?? [],
    familyMembers: membersResult.data ?? []
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
): Promise<{ householdId: string; inviteId: string; invitedBy: string; email?: string; phoneNumber?: string } | null> {
  const admin = getAdminClient();
  
  // 1. Find by token (Universal for Email, Phone, and Open Invites)
  const { data: invite } = await admin
    .from('household_invites')
    .select('id, household_id, invited_by, expires_at, email, phone_number')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (invite) {
     // Check expiration
     if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
         return null; 
     }

     return { 
        householdId: invite.household_id, 
        inviteId: invite.id,
        invitedBy: invite.invited_by,
        email: invite.email ?? undefined,
        phoneNumber: invite.phone_number ?? undefined
      };
  }

  // Legacy fallback removed as we are standardizing on tokens now.
  // The migration adds tokens to all future invites.
  // Old invites without tokens will just expire naturally or need re-issue.
  
  return null;
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
