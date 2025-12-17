import { NextRequest, NextResponse } from 'next/server';
import { 
  createFamilyInvite, 
  addFamilyMember, 
  getFamilyMembers,
  getPendingInvites 
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';

/**
 * GET - Get family members and pending invites
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');
    
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Missing firebaseUid' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user and their family
    const { data: user, error } = await admin
      .from('users')
      .select('household_id, is_admin')
      .eq('firebase_uid', firebaseUid)
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
 */
export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, action, phoneNumber, name } = await request.json();
    
    if (!firebaseUid || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user and verify they're admin
    const { data: user, error } = await admin
      .from('users')
      .select('id, household_id, is_admin')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    if (!user.is_admin) {
      return NextResponse.json({ error: 'Only admin can add members' }, { status: 403 });
    }
    
    if (action === 'invite' && phoneNumber) {
      // Create invite for WhatsApp user
      const success = await createFamilyInvite(user.household_id, phoneNumber, user.id);
      
      if (!success) {
        return NextResponse.json({ 
          error: 'Failed to create invite. User may already be in another family.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invite created. Ask them to message the FamilyButler WhatsApp.' 
      });
    }
    
    if (action === 'add' && name) {
      // Add family member (non-WhatsApp)
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
 */
export async function DELETE(request: NextRequest) {
  try {
    const { firebaseUid, action } = await request.json();
    
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Missing firebaseUid' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user
    const { data: user, error } = await admin
      .from('users')
      .select('id, household_id, is_admin')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }
    
    if (action === 'leave' && !user.is_admin) {
      // Non-admin leaving family
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
      // Admin deleting family - unset all members first
      await admin
        .from('users')
        .update({ household_id: null, is_admin: false })
        .eq('household_id', user.household_id);
      
      // Delete family (cascades to events, family_members, invites)
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
