import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth-helpers';

/**
 * GET - Fetch user account data for settings page
 */
export async function GET() {
  try {
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const admin = getAdminClient();

    // Get user data
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, email, phone_number, display_name, telegram_chat_id, supabase_user_id, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to get email from Supabase Auth if not in users table
    let email = user.email;
    if (!email && user.supabase_user_id) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(user.supabase_user_id);
        if (authUser?.user?.email) {
          email = authUser.user.email;
          // Also update the users table to sync the email
          await admin
            .from('users')
            .update({ email: authUser.user.email })
            .eq('id', user.id);
        }
      } catch (authError) {
        console.error('Error fetching auth user:', authError);
      }
    }

    // Build response with connection statuses
    const accountData = {
      displayName: user.display_name || '',
      email: email || null,
      phoneNumber: user.phone_number || null,
      connections: {
        whatsapp: !!user.phone_number,
        telegram: !!user.telegram_chat_id,
        supabaseAuth: !!user.supabase_user_id,
      },
      createdAt: user.created_at,
    };

    return NextResponse.json({ success: true, data: accountData });

  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


/**
 * PUT - Update user profile
 * SECURITY: Uses validateSession() to get userId from session
 */
export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = session;
    const { displayName, phoneNumber } = await request.json();
    const admin = getAdminClient();
    
    // Get user using validated session userId
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Build update object
    const updateData: Record<string, string> = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (phoneNumber !== undefined) updateData.phone_number = phoneNumber;
    
    // Update user
    const { error: updateError } = await admin
      .from('users')
      .update(updateData)
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
 * SECURITY: Uses validateSession() to get userId from session
 */
export async function DELETE() {
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
    
    // Get user using validated session userId
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, household_id, is_admin')
      .eq('id', userId)
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
