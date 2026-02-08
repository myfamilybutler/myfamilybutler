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
} from '@/lib/supabase';
import { sendInviteEmail } from '@/lib/email/send-email';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { log } from '@/lib/utils/logger';
import { sendPhoneInviteMessages } from '@/lib/invites/delivery';

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
    
    const [members, pendingInvites] = await Promise.all([
      getFamilyMembers(user.household_id),
      getPendingInvites(user.household_id)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        familyId: user.household_id,
        isHouseholdAdmin: user.is_household_admin ?? false,  // Household admin, not super admin
        users: members.users,
        familyMembers: members.familyMembers,
        pendingInvites: pendingInvites
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
    const { action, phoneNumber, email, name, memberId, color, inviteId } = await request.json();
    
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
      
      const { data: household, error: createError } = await admin
        .from('households')
        .insert({ name: name || 'My Family' })
        .select()
        .single();
      
      if (createError || !household) {
        log.error('Create household error:', createError);
        return NextResponse.json({ error: 'Failed to create family' }, { status: 500 });
      }
      
      // Update user
      const { error: updateError } = await admin
        .from('users')
        .update({ 
          household_id: household.id,
          is_household_admin: true
        })
        .eq('id', user.id);
        
      if (updateError) {
        await admin.from('households').delete().eq('id', household.id);
        log.error('Link user to household error:', updateError);
        return NextResponse.json({ error: 'Failed to link user to family' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, householdId: household.id });
    }
    
    // For other actions, require household
    if (!user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    

    // Household admin check for edit/delete actions - all members can invite/add
    if (!user.is_household_admin && action !== 'invite' && action !== 'inviteEmail' && action !== 'add') {
      return NextResponse.json({ error: 'Only household admin can edit/delete members' }, { status: 403 });
    }
    
    // ACTION: removeUser - Unlink a user from the family
    if (action === 'removeUser') {
      if (!memberId) {
        return NextResponse.json({ error: 'Missing memberId (userId)' }, { status: 400 });
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

      // Unlink user
      const { error: removeError } = await admin
        .from('users')
        .update({ 
          household_id: null,
          is_household_admin: false 
        })
        .eq('id', memberId);
        
      if (removeError) {
        log.error('Remove user error:', removeError);
        return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    if (action === 'invite' && phoneNumber) {
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
    
    // Non-household-admin can leave the family
    if (action === 'leave' && !user.is_household_admin) {
      const { error: updateError } = await admin
        .from('users')
        .update({ household_id: null, is_household_admin: false })
        .eq('id', user.id);
      
      if (updateError) {
        return NextResponse.json({ error: 'Failed to leave family' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    // Only household admin can delete the family
    if (action === 'deleteFamily' && user.is_household_admin) {
      await admin
        .from('users')
        .update({ household_id: null, is_household_admin: false })
        .eq('household_id', user.household_id);
      
      const { error: deleteError } = await admin
        .from('households')
        .delete()
        .eq('id', user.household_id);
      
      if (deleteError) {
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
