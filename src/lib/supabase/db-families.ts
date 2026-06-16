/**
 * Family Database Operations
 */
import { getAdminClient } from './client';
// Use Node's crypto for secure token generation
import { randomUUID } from 'crypto';
import { normalizeFamilyMemberName } from '@/lib/utils/family-members';
import { ensureFamilyMembersForNames } from './family-member-sync';
import { normalizePhone } from './identity';
import { logError } from '@/lib/utils/logger';

type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

export interface ResolvedInvite {
  inviteId: string;
  householdId: string;
  householdName?: string;
  invitedBy?: string;
  inviterDisplayName?: string;
  email?: string;
  phoneNumber?: string;
  status: InviteStatus;
  expiresAt?: string;
}

function isInviteExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt) < new Date();
}

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
    logError('Error creating family:', createError);
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
    logError('Error linking user to family:', updateError);
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
  const normalizedPhone = normalizePhone(phoneNumber);

  if (!normalizedPhone) {
    return null;
  }
  
  const { data, error } = await admin
    .from('household_invites')
    .select('id, household_id')
    .eq('phone_number', normalizedPhone)
    .eq('status', 'pending')
    .maybeSingle();
  
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
  
  // Preferred path: DB-side atomic transaction
  const { data, error } = await admin.rpc('accept_household_invite', {
    p_user_id: userId,
    p_invite_id: inviteId,
    p_household_id: familyId
  });
  
  if (!error) {
    return data === true;
  }
  
  // Fallback path for environments where the RPC is missing/outdated.
  logError('Error accepting invite (RPC), falling back:', error);

  const { data: pendingInvite, error: pendingInviteError } = await admin
    .from('household_invites')
    .select('id, expires_at')
    .eq('id', inviteId)
    .eq('household_id', familyId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingInviteError || !pendingInvite) {
    logError('Fallback accept: pending invite not found:', pendingInviteError);
    return false;
  }

  if (isInviteExpired(pendingInvite.expires_at)) {
    await admin
      .from('household_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId)
      .eq('status', 'pending');
    return false;
  }

  const { data: acceptedInvite, error: inviteUpdateError } = await admin
    .from('household_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)
    .eq('household_id', familyId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (inviteUpdateError || !acceptedInvite) {
    logError('Fallback accept: invite update failed:', inviteUpdateError);
    return false;
  }

  const { error: userUpdateError } = await admin
    .from('users')
    .update({
      household_id: familyId,
      is_household_admin: false,
    })
    .eq('id', userId);

  if (userUpdateError) {
    logError('Fallback accept: user update failed, rolling back invite:', userUpdateError);
    await admin
      .from('household_invites')
      .update({ status: 'pending' })
      .eq('id', inviteId)
      .eq('status', 'accepted');
    return false;
  }

  return true;
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
    logError('Error creating open invite:', error);
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
  const normalizedPhone = normalizePhone(phoneNumber);

  if (!normalizedPhone) {
    return null;
  }
  
  // Check if user already exists and is in another household
  const { data: existingUser } = await admin
    .from('users')
    .select('household_id')
    .eq('phone_number', normalizedPhone)
    .maybeSingle();
  
  if (existingUser?.household_id) {
    logError('User already belongs to a family');
    return null;
  }
  
  // Generate secure token
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { data, error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      phone_number: normalizedPhone,
      invited_by: invitedBy,
      status: 'pending',
      token: token,
      expires_at: expiresAt.toISOString()
    })
    .select('token')
    .single();
  
  if (error?.code === '23505') {
    const { data: existingInvite } = await admin
      .from('household_invites')
      .select('token')
      .eq('household_id', familyId)
      .eq('phone_number', normalizedPhone)
      .eq('status', 'pending')
      .single();

    if (existingInvite?.token) {
      return existingInvite.token;
    }
  }

  if (error || !data) {
    logError('Error creating invite:', error);
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
  const normalizedName = normalizeFamilyMemberName(name);

  if (!normalizedName) {
    return false;
  }
  
  const { error } = await admin
    .from('family_members')
    .insert({
      household_id: familyId,
      name: normalizedName
    });
  
  if (error) {
    if (error.code === '23505') {
      // Existing member name for this household; treat as idempotent success.
      return true;
    }
    logError('Error adding family member:', error);
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
  const normalizedName = normalizeFamilyMemberName(name);
  
  if (!normalizedName) {
    return false;
  }

  const updateData: { name: string; color?: string } = { name: normalizedName };
  if (color) {
    updateData.color = color;
  }
  
  const { error } = await admin
    .from('family_members')
    .update(updateData)
    .eq('id', memberId)
    .eq('household_id', familyId); // Security: ensure member belongs to user's family
  
  if (error) {
    if (error.code === '23505') {
      return true;
    }
    logError('Error editing family member:', error);
    return false;
  }

  // Keep denormalized event labels in sync for existing assigned events.
  const { error: eventsUpdateError } = await admin
    .from('events')
    .update({ family_member: normalizedName })
    .eq('household_id', familyId)
    .eq('family_member_id', memberId);

  if (eventsUpdateError) {
    logError('Error syncing event family member labels:', eventsUpdateError);
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
    logError('Error deleting family member:', error);
    return false;
  }
  
  return true;
}

/**
 * Get all members of a family (both users and family members)
 */
export async function getFamilyMembers(
  familyId: string
): Promise<{ users: Array<{ id: string; display_name?: string; phone_number?: string; linked_email?: string; is_household_admin: boolean }>; familyMembers: Array<{ id: string; name: string; color?: string }> }> {
  const admin = getAdminClient();
  
  // Fetch users and event-level member labels in parallel.
  const [usersResult, eventMembersResult] = await Promise.all([
    admin
      .from('users')
      .select('id, display_name, phone_number, linked_email, is_household_admin')
      .eq('household_id', familyId),
    admin
      .from('events')
      .select('family_member')
      .eq('household_id', familyId)
      .not('family_member', 'is', null),
  ]);

  if (eventMembersResult.error) {
    logError('Error fetching event member labels:', eventMembersResult.error);
  } else {
    await ensureFamilyMembersForNames(
      familyId,
      (eventMembersResult.data ?? []).map((row) => row.family_member)
    );
  }

  // Fetch persisted member profiles after sync.
  const membersResult = await admin
    .from('family_members')
    .select('id, name, color')
    .eq('household_id', familyId);
  
  if (usersResult.error) {
    logError('Error fetching family users:', usersResult.error);
  }
  
  if (membersResult.error) {
    logError('Error fetching family members:', membersResult.error);
  }
  
  return {
    users: (usersResult.data ?? []).map((user) => ({
      ...user,
      phone_number: user.phone_number ?? undefined,
    })),
    familyMembers: membersResult.data ?? []
  };
}

/**
 * Get pending invites for a family
 */
export async function getPendingInvites(
  familyId: string
): Promise<Array<{ id: string; phone_number?: string | null; email?: string | null; token: string; status: InviteStatus; created_at: string; expires_at?: string | null }>> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('household_invites')
    .select('id, phone_number, email, token, status, created_at, expires_at')
    .eq('household_id', familyId)
    .eq('status', 'pending');
  
  if (error) {
    logError('Error fetching pending invites:', error);
    return [];
  }
  
  return data ?? [];
}

/**
 * Resolve invite by token with household/inviter display metadata.
 */
export async function resolveInviteByToken(
  token: string
): Promise<ResolvedInvite | null> {
  const admin = getAdminClient();
  
  const { data: invite, error } = await admin
    .from('household_invites')
    .select('id, household_id, invited_by, status, expires_at, email, phone_number')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    return null;
  }

  let status = invite.status as InviteStatus;
  if (status === 'pending' && isInviteExpired(invite.expires_at)) {
    await admin
      .from('household_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id)
      .eq('status', 'pending');
    status = 'expired';
  }

  const [householdRes, inviterRes] = await Promise.all([
    admin.from('households').select('name').eq('id', invite.household_id).maybeSingle(),
    invite.invited_by
      ? admin
          .from('users')
          .select('display_name, linked_email, phone_number')
          .eq('id', invite.invited_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const inviterDisplayName =
    inviterRes.data?.display_name ||
    inviterRes.data?.linked_email ||
    inviterRes.data?.phone_number ||
    undefined;

  return {
    inviteId: invite.id,
    householdId: invite.household_id,
    householdName: householdRes.data?.name ?? undefined,
    invitedBy: invite.invited_by ?? undefined,
    inviterDisplayName,
    email: invite.email ?? undefined,
    phoneNumber: invite.phone_number ?? undefined,
    status,
    expiresAt: invite.expires_at ?? undefined,
  };
}

/**
 * Get invite by Token (supports both QR code and Email token)
 */
export async function getInviteByToken(
  token: string
): Promise<{ householdId: string; inviteId: string; invitedBy?: string; email?: string; phoneNumber?: string } | null> {
  const invite = await resolveInviteByToken(token);
  if (!invite || invite.status !== 'pending') {
    return null;
  }

  return {
    householdId: invite.householdId,
    inviteId: invite.inviteId,
    invitedBy: invite.invitedBy,
    email: invite.email,
    phoneNumber: invite.phoneNumber,
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
  
  if (error?.code === '23505') {
    const { data: existingInvite } = await admin
      .from('household_invites')
      .select('token')
      .eq('household_id', familyId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvite?.token) {
      return existingInvite.token;
    }
  }

  if (error || !data) {
    logError('Error creating email invite:', error);
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
    logError('Error fetching invite by ID:', error);
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

/**
 * Decline an invite.
 */
export async function declineInvite(inviteId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('household_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    logError('Error declining invite:', error);
    return false;
  }

  return true;
}

/**
 * Revoke a pending invite from the inviter side.
 */
export async function revokeInvite(inviteId: string, familyId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('household_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('household_id', familyId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    logError('Error revoking invite:', error);
    return false;
  }

  return true;
}
