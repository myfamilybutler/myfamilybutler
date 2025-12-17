import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * PUT - Update user profile
 */
export async function PUT(request: NextRequest) {
  try {
    const { firebaseUid, displayName } = await request.json();
    
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Missing firebaseUid' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user to verify existence
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user
    const { error: updateError } = await admin
      .from('users')
      .update({ display_name: displayName })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete user account (GDPR: Right to erasure)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { firebaseUid } = await request.json();
    
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Missing firebaseUid' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, household_id, is_admin')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // If user is admin and only admin in household, delete household too
    if (user.household_id && user.is_admin) {
      const { data: otherAdmins } = await admin
        .from('users')
        .select('id')
        .eq('household_id', user.household_id)
        .eq('is_admin', true)
        .neq('id', user.id);
      
      if (!otherAdmins || otherAdmins.length === 0) {
        // Delete household (cascades to events, family_members, invites)
        await admin
          .from('households')
          .delete()
          .eq('id', user.household_id);
      }
    }
    
    // Delete user's messages
    await admin
      .from('messages')
      .delete()
      .eq('user_id', user.id);
    
    // Delete user's reminders
    await admin
      .from('reminders')
      .delete()
      .eq('user_id', user.id);
    
    // Delete user
    const { error: deleteError } = await admin
      .from('users')
      .delete()
      .eq('id', user.id);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
