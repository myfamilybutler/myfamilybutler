/**
 * Family Database Operations
 */
import { getAdminClient } from './client';
// Use Node's crypto for secure token generation and hashing
import { randomUUID, createHash } from 'crypto';
import { normalizeFamilyMemberName } from '@/lib/utils/family-members';
import { ensureFamilyMembersForNames } from './family-member-sync';
import { normalizePhone } from './identity';
import { logError, log } from '@/lib/utils/logger';

/**
 * Hash an invite token for storage. We use SHA-256 so the database never
 * stores usable plaintext tokens.
 */
function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
 * Create a new family and set user as admin.
 * Delegates to the atomic RPC so the household and user link are created
 * in a single transaction and cannot leave an orphan household.
 */
export async function createFamilyForUser(
  userId: string,
  displayName?: string
): Promise<string | null> {
  const admin = getAdminClient();

  const familyName = displayName ? `${displayName}'s Family` : 'Familie';

  const { data: householdId, error: rpcError } = await admin.rpc(
    'create_household_for_user',
    {
      p_user_id: userId,
      p_household_name: familyName,
    }
  );

  if (rpcError || !householdId) {
    logError('Error creating family via RPC:', rpcError);
    return null;
  }

  // Optionally set display name outside the RPC; this is not critical for
  // household integrity, so a failure here does not break the flow.
  if (displayName) {
    await admin
      .from('users')
      .update({ display_name: displayName })
      .eq('id', userId);
  }

  return householdId as string;
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
  familyId: string,
  forceSwitch: boolean = false
): Promise<boolean> {
  const admin = getAdminClient();
  
  // DB-side atomic transaction. The RPC validates the invite (status,
  // expiration, household match), locks the user row, and enforces the
  // force-switch policy. We intentionally do not provide a client-side fallback
  // because any fallback would reintroduce the race conditions and bypasses the
  // RPC is meant to prevent.
  const { data, error } = await admin.rpc('accept_household_invite', {
    p_user_id: userId,
    p_invite_id: inviteId,
    p_household_id: familyId,
    p_force_switch: forceSwitch,
  });

  if (error) {
    logError('Error accepting invite (RPC):', error);
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
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Revoke any existing pending open invites for this household before creating
  // a new one. This keeps the UX simple (one active open link at a time) and
  // avoids a proliferation of unused pending tokens.
  const { error: revokeError } = await admin
    .from('household_invites')
    .update({ status: 'revoked' })
    .eq('household_id', familyId)
    .eq('status', 'pending')
    .is('phone_number', null)
    .is('email', null);

  if (revokeError) {
    logError('Error revoking existing open invites:', revokeError);
    return null;
  }

  const { error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      invited_by: invitedBy,
      status: 'pending',
      token: tokenHash,
      expires_at: expiresAt.toISOString(),
      // No email or phone_number
    });

  if (error) {
    logError('Error creating open invite:', error);
    return null;
  }

  return token;
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
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      phone_number: normalizedPhone,
      invited_by: invitedBy,
      status: 'pending',
      token: tokenHash,
      expires_at: expiresAt.toISOString()
    });

  if (error?.code === '23505') {
    // A pending invite already exists. We cannot return the original token,
    // so instruct the caller to create a fresh one (or implement a secure
    // retrieval flow in the future).
    log.info('Pending invite already exists for phone');
    return null;
  }

  if (error) {
    logError('Error creating invite:', error);
    return null;
  }

  return token;
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
  // Only scan events from roughly the last 12 months so this does not grow
  // unbounded for old households.
  const memberScanSince = new Date();
  memberScanSince.setMonth(memberScanSince.getMonth() - 12);

  const [usersResult, eventMembersResult] = await Promise.all([
    admin
      .from('users')
      .select('id, display_name, phone_number, linked_email, is_household_admin')
      .eq('household_id', familyId),
    admin
      .from('events')
      .select('family_member')
      .eq('household_id', familyId)
      .not('family_member', 'is', null)
      .gte('event_date', memberScanSince.toISOString().slice(0, 10)),
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
): Promise<Array<{ id: string; phone_number?: string | null; email?: string | null; status: InviteStatus; created_at: string; expires_at?: string | null }>> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('household_invites')
    .select('id, phone_number, email, status, created_at, expires_at')
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
  const tokenHash = hashInviteToken(token);

  const { data: invite, error } = await admin
    .from('household_invites')
    .select('id, household_id, invited_by, status, expires_at, email, phone_number')
    .eq('token', tokenHash)
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
          .select('display_name')
          .eq('id', invite.invited_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // SECURITY: Never fall back to linked_email or phone_number for the inviter
  // display name; expose display_name only and use a generic label otherwise.
  const inviterDisplayName =
    inviterRes.data?.display_name || 'A family member';

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

  // Do not invite an email already linked to a user in any household.
  const { data: existingUser } = await admin
    .from('users')
    .select('household_id')
    .eq('linked_email', normalizedEmail)
    .maybeSingle();

  if (existingUser?.household_id) {
    log.info('Email invite rejected: user already belongs to a family');
    return null;
  }

  // Create secure token and expiration
  const token = randomUUID();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const { error } = await admin
    .from('household_invites')
    .insert({
      household_id: familyId,
      email: normalizedEmail,
      invited_by: invitedBy,
      status: 'pending',
      token: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (error?.code === '23505') {
    log.info('Pending email invite already exists');
    return null;
  }

  if (error) {
    logError('Error creating email invite:', error);
    return null;
  }

  return token;
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
