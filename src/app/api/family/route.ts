import { NextRequest, NextResponse } from 'next/server';
import { 
  createFamilyInvite, 
  addFamilyMember, 
  getFamilyMembers,
  getPendingInvites 
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth-helpers';

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
      .select('household_id, is_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    const members = await getFamilyMembers(user.household_id);
    const pendingInvites = await getPendingInvites(user.household_id);
    
    return NextResponse.json({
      success: true,
      data: {
        familyId: user.household_id,
        isAdmin: user.is_admin,
        users: members.users,
        familyMembers: members.familyMembers,
        pendingInvites: pendingInvites
      }
    });
  } catch (error) {
    console.error('Get family error:', error);
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
    const { action, phoneNumber, name } = await request.json();
    
    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user using validated session userId
    const { data: user, error } = await admin
      .from('users')
      .select('id, household_id, is_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    if (!user.is_admin) {
      return NextResponse.json({ error: 'Only admin can add members' }, { status: 403 });
    }
    
    if (action === 'invite' && phoneNumber) {
      const success = await createFamilyInvite(user.household_id, phoneNumber, user.id);
      
      if (!success) {
        return NextResponse.json({ 
          error: 'Failed to create invite. User may already be in another family.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invite created. Ask them to message the My Family Butler WhatsApp.' 
      });
    }
    
    if (action === 'add' && name) {
      const success = await addFamilyMember(user.household_id, name);
      
      if (!success) {
        return NextResponse.json({ error: 'Failed to add family member' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Family action error:', error);
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
      .select('id, household_id, is_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    if (action === 'leave' && !user.is_admin) {
      const { error: updateError } = await admin
        .from('users')
        .update({ household_id: null, is_admin: false })
        .eq('id', user.id);
      
      if (updateError) {
        return NextResponse.json({ error: 'Failed to leave family' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    if (action === 'deleteFamily' && user.is_admin) {
      await admin
        .from('users')
        .update({ household_id: null, is_admin: false })
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
    console.error('Family delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
