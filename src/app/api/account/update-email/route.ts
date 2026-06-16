import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase';
import { logError } from '@/lib/utils/logger';

/**
 * POST - Initiate email address change
 *
 * Uses standard Supabase Auth to update the user's email.
 * Supabase sends a confirmation email to the new address automatically.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check if email is already in use by another user
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('linked_email', normalizedEmail)
      .neq('id', user.id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use by another account' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      email: normalizedEmail,
    });

    if (updateError) {
      logError('[update-email] Supabase update error:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox and click the link to confirm.',
    });
  } catch (error) {
    logError('[update-email] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
