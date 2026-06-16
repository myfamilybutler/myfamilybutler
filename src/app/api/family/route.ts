import { NextRequest, NextResponse } from 'next/server';
import { 
  createFamilyInvite, 
  createEmailInvite,
  addFamilyMember, 
  editFamilyMember,
  deleteFamilyMember,
  getFamilyMembers,
  getPendingInvites,
  revokeInvite,
  normalizePhone,
  getAdminClient,
} from '@/lib/supabase';
import { sendInviteEmail } from '@/lib/email/send-email';
import { validateSession } from '@/lib/auth/helpers';
import { log } from '@/lib/utils/logger';
import { sendPhoneInviteMessages } from '@/lib/invites/delivery';
import { checkRateLimit } from '@/lib/core/rate-limit';

/**
 * GET - Get family members and pending invites
 * SECURITY: Uses validateSession() to get userId from session
 */
export async function GET() {
  try {
    // SECURITY: Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = session;
    const admin = getAdminClient();
    
    // Get user and their family using validated session userId
    const { data: user, error } = await admin
      .from('users')
      .select('household_id, is_household_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    const [members, pendingInvites, householdResult] = await Promise.all([
      getFamilyMembers(user.household_id),
      getPendingInvites(user.household_id),
      admin.from('households').select('gemini_api_key').eq('id', user.household_id).maybeSingle()
    ]);
    
    const hasGeminiKey = !!householdResult?.data?.gemini_api_key;
    
    return NextResponse.json({
      success: true,
      data: {
        familyId: user.household_id,
        isHouseholdAdmin: user.is_household_admin ?? false,  // Household admin, not super admin
        users: members.users,
        familyMembers: members.familyMembers,
        pendingInvites: pendingInvites,
        hasGeminiKey
      }
    });
  } catch (error) {
    log.error('Get family error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Add member or invite
 * SECURITY: Uses validateSession() to get userId from session
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = session;
    const { action, phoneNumber, email, name, memberId, color, inviteId, geminiApiKey } = await request.json();
    
    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user using validated session userId
    const { data: user, error } = await admin
      .from('users')
      .select('id, household_id, is_household_admin, display_name')
      .eq('id', userId)
      .single();
    
    if (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Allow creation of household if user doesn't have one
    if (action === 'create') {
      if (user.household_id) {
        return NextResponse.json({ error: 'User already has a family' }, { status: 400 });
      }

      // Use an atomic RPC that locks the user row and creates/links the household.
      const { data: householdId, error: rpcError } = await admin.rpc(
        'create_household_for_user',
        {
          p_user_id: user.id,
          p_household_name: name || 'My Family',
        }
      );

      if (rpcError || !householdId) {
        log.error('Create household RPC error:', rpcError);
        return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
      }

      return NextResponse.json({ success: true, householdId });
    }
    
    // For other actions, require household
    if (!user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    

    // Household admin check: adding members, sending invites, editing/removing
    // members, updating settings, and deleting the family are all admin-only.
    if (!user.is_household_admin) {
      return NextResponse.json({ error: 'Only household admin can manage members' }, { status: 403 });
    }
    
    // ACTION: removeUser - Unlink a user from the family
    if (action === 'removeUser') {
      if (!memberId) {
        return NextResponse.json({ error: 'Missing memberId (userId)' }, { status: 400 });
      }

      // Prevent removing the last admin, which would leave the household
      // unmanageable.
      if (memberId === user.id && user.is_household_admin) {
        const { count } = await admin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('household_id', user.household_id)
          .eq('is_household_admin', true);
        if (count === 1) {
          return NextResponse.json(
            { error: 'Cannot remove the only admin. Transfer ownership or delete the family.' },
            { status: 403 }
          );
        }
      }

      // Ensure target is actually in the same family
      const { data: targetUser } = await admin
        .from('users')
        .select('household_id')
        .eq('id', memberId)
        .single();

      if (!targetUser || targetUser.household_id !== user.household_id) {
        return NextResponse.json({ error: 'User does not belong to your family' }, { status: 403 });
      }

      // Unlink user. Include the household_id check so a concurrent move
      // cannot accidentally unlink them from a different household.
      const { error: removeError } = await admin
        .from('users')
        .update({
          household_id: null,
          is_household_admin: false
        })
        .eq('id', memberId)
        .eq('household_id', user.household_id);

      if (removeError) {
        log.error('Remove user error:', removeError);
        return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
      }

      // Clean up user-scoped data in this household so the removed user does
      // not carry stale reminders or messages from a household they no longer
      // belong to.
      await admin
        .from('reminders')
        .delete()
        .eq('user_id', memberId)
        .eq('household_id', user.household_id);
      await admin
        .from('messages')
        .delete()
        .eq('user_id', memberId)
        .eq('household_id', user.household_id);

      return NextResponse.json({ success: true });
    }
    
    if (action === 'invite' && phoneNumber) {
      const rateKey = `invite:phone:${user.household_id}`;
      const allowed = await checkRateLimit(rateKey, 5 * 60 * 1000, 10);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many invites. Please try again later.' },
          { status: 429 }
        );
      }

      const normalizedPhone = normalizePhone(phoneNumber);
      if (!normalizedPhone) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
      }

      const token = await createFamilyInvite(user.household_id, normalizedPhone, user.id);
      
      if (!token) {
        return NextResponse.json({ 
          error: 'Failed to create invite. User may already be in another family.' 
        }, { status: 400 });
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const joinLink = `${baseUrl}/invite/join?token=${token}`;
      const { data: household } = await admin
        .from('households')
        .select('name')
        .eq('id', user.household_id)
        .maybeSingle();

      const delivery = await sendPhoneInviteMessages({
        phoneNumber: normalizedPhone,
        joinLink,
        inviterName: user.display_name ?? undefined,
        householdName: household?.name ?? undefined,
      });

      const deliveredVia: string[] = [];
      if (delivery.whatsapp.success) deliveredVia.push('WhatsApp');
      if (delivery.telegram.success) deliveredVia.push('Telegram');

      const message =
        deliveredVia.length > 0
          ? `Invite sent via ${deliveredVia.join(' and ')}.`
          : 'Invite created, but automatic delivery failed. Share the link manually.';

      return NextResponse.json({ 
        success: true, 
        message,
        link: joinLink,
        delivery,
      });
    }

    if (action === 'inviteEmail' && email) {
      const rateKey = `invite:email:${user.household_id}`;
      const allowed = await checkRateLimit(rateKey, 5 * 60 * 1000, 10);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many invites. Please try again later.' },
          { status: 429 }
        );
      }

      const inviteId = await createEmailInvite(user.household_id, email, user.id);
      
      if (!inviteId) {
        return NextResponse.json({ error: 'Failed to create email invite' }, { status: 500 });
      }
      
      // Send email
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      // Use token instead of id for secure auto-login
      const joinLink = `${baseUrl}/invite/join?token=${inviteId}`;
      
      const emailResult = await sendInviteEmail(email, joinLink, user.display_name);
      
      if (!emailResult.success) {
        log.error('Failed to send invite email:', emailResult.error);
        return NextResponse.json({ 
          success: true, 
          message: `Invite created but email failed: ${emailResult.error || 'Unknown error'}. You can share the link manually.`,
          link: joinLink 
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invitation sent via email!',
        link: joinLink
      });
    }
    
    if (action === 'add' && name) {
      const success = await addFamilyMember(user.household_id, name);
      
      if (!success) {
        return NextResponse.json({ error: 'Failed to add family member' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    if (action === 'edit') {
      if (!memberId || !name) {
        return NextResponse.json({ error: 'Missing memberId or name' }, { status: 400 });
      }
      
      const success = await editFamilyMember(memberId, name, user.household_id, color);
      
      if (!success) {
        return NextResponse.json({ error: 'Failed to edit family member' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    if (action === 'deleteMember') {
      if (!memberId) {
        return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
      }
      
      const success = await deleteFamilyMember(memberId, user.household_id);
      
      if (!success) {
        return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }

    if (action === 'revokeInvite') {
      if (!inviteId) {
        return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 });
      }

      const success = await revokeInvite(inviteId, user.household_id);

      if (!success) {
        return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }
    if (action === 'updateGeminiKey') {
      if (!user.is_household_admin) {
        return NextResponse.json({ error: 'Only household admin can update the API key' }, { status: 403 });
      }

      const trimmedKey = geminiApiKey ? geminiApiKey.trim() : null;
      if (trimmedKey && !/^AIza[0-9A-Za-z_-]{35}$/.test(trimmedKey)) {
        return NextResponse.json({ error: 'Invalid Gemini API key format' }, { status: 400 });
      }

      try {
        const { encrypt } = await import('@/lib/utils/encryption');
        const encryptedKey = trimmedKey ? encrypt(trimmedKey) : null;

        const { error: updateError } = await admin
          .from('households')
          .update({ gemini_api_key: encryptedKey })
          .eq('id', user.household_id);

        if (updateError) {
          log.error('Update Gemini key error:', updateError);
          return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to encrypt API key';
        log.error('Encrypt Gemini key error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    log.error('Family action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Leave or delete family
 * SECURITY: Uses validateSession() to get userId from session
 */
export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = session;
    const { action } = await request.json();
    const admin = getAdminClient();
    
    // Get user using validated session userId
    const { data: user, error } = await admin
      .from('users')
      .select('id, household_id, is_household_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    // Leave the family. Admins may leave only if at least one other admin
    // remains so the household is not left unmanageable.
    if (action === 'leave') {
      if (user.is_household_admin) {
        const { count } = await admin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('household_id', user.household_id)
          .eq('is_household_admin', true);
        if (count === 1) {
          return NextResponse.json(
            { error: 'The only admin cannot leave. Transfer ownership or delete the family.' },
            { status: 403 }
          );
        }
      }

      const { error: updateError } = await admin
        .from('users')
        .update({ household_id: null, is_household_admin: false })
        .eq('id', user.id)
        .eq('household_id', user.household_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to leave family' }, { status: 500 });
      }

      // Clean up household-scoped data for the leaving user.
      await admin
        .from('messages')
        .delete()
        .eq('user_id', user.id)
        .eq('household_id', user.household_id);
      await admin
        .from('reminders')
        .delete()
        .eq('user_id', user.id)
        .is('event_id', null);

      return NextResponse.json({ success: true });
    }
    
    // Only household admin can delete the family
    if (action === 'deleteFamily' && user.is_household_admin) {
      const { data: deleted, error: deleteError } = await admin.rpc(
        'delete_household_atomic',
        {
          p_household_id: user.household_id,
          p_user_id: user.id,
        }
      );

      if (deleteError || !deleted) {
        log.error('Delete household RPC error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete family' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action or permission denied' }, { status: 400 });
  } catch (error) {
    log.error('Family delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
