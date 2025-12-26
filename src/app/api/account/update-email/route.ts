import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';

/**
 * POST - Update user email address
 * 
 * Updates the linked_email in the users table.
 * This email is used for desktop magic link login.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = session;
    const { email } = await request.json();

    // Validate email format
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Update linked_email in users table
    const { error: updateError } = await admin
      .from('users')
      .update({ linked_email: email })
      .eq('id', userId);

    if (updateError) {
      console.error('[update-email] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email updated successfully.',
    });
  } catch (error) {
    console.error('[update-email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
