import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, normalizePhone } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

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
      .select('id, linked_email, phone_number, display_name, telegram_chat_id, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build response with connection statuses
    const accountData = {
      displayName: user.display_name || '',
      email: user.linked_email || null,
      phoneNumber: user.phone_number || null,
      connections: {
        whatsapp: !!user.phone_number,
        telegram: !!user.telegram_chat_id,
        supabaseAuth: true,
      },
      createdAt: user.created_at,
    };

    return NextResponse.json({ success: true, data: accountData });

  } catch (error) {
    logError('Get account error:', error);
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
    const { displayName, phoneNumber, email } = await request.json();
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
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.display_name = displayName;

    // Normalize and validate email
    if (email !== undefined) {
      if (email === '' || email === null) {
        updateData.linked_email = null;
        updateData.email_verified = false;
      } else {
        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }
        updateData.linked_email = normalizedEmail;
        updateData.email_verified = false;
      }
    }

    // Normalize and validate phone number using identity module
    if (phoneNumber !== undefined) {
      if (phoneNumber === '' || phoneNumber === null) {
        // Allow clearing phone number
        updateData.phone_number = null;
        updateData.phone_verified = false;
      } else {
        const normalized = normalizePhone(phoneNumber);
        if (!normalized) {
          return NextResponse.json({ error: 'Invalid phone number format. Please use format: +43 660 1234567' }, { status: 400 });
        }
        updateData.phone_number = normalized;
        updateData.phone_verified = false; // Needs to be verified via messaging
      }
    }

    // Update user
    const { error: updateError } = await admin
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      logError('Error updating user:', updateError);
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'Email/phone already in use' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Update account error:', error);
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
      .select('id, household_id, is_household_admin')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // If user is household admin and only admin in household, delete household too
    if (user.household_id && user.is_household_admin) {
      const { data: otherAdmins } = await admin
        .from('users')
        .select('id')
        .eq('household_id', user.household_id)
        .eq('is_household_admin', true)
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
    
    // Delete the Supabase Auth user first. Once auth is gone the session is
    // invalidated and the account cannot log in again, even if the public.users
    // cleanup below were to fail.
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      logError('Error deleting Supabase Auth user:', authDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete account authentication' },
        { status: 500 }
      );
    }

    // Delete the public user row and related data now that auth is gone.
    const { error: deleteError } = await admin
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      logError('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    // Clear the session cookie so the deleted session is removed from the browser
    try {
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (signOutError) {
      logError('Error clearing session after account deletion:', signOutError);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
