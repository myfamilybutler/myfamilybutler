import { NextRequest, NextResponse } from 'next/server';
import { getInviteByToken, acceptInvite, getAdminClient, normalizePhone } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * POST /api/auth/invite-claim
 * Allows a logged-in user to claim an open invite (or any invite) using a token.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, forceSwitch } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Validate Session (User MUST be logged in to claim)
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = session;

    // 2. Verify token
    const invite = await getInviteByToken(token);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // 3. User Validation (Prevent claiming if already in family, unless switching?)
    // For now, let's allow switching or just linking.
    const admin = getAdminClient();
    const { data: user } = await admin
      .from('users')
      .select('household_id, linked_email, phone_number')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Targeted invite safety check: only the targeted identity may claim.
    if (invite.email) {
      const normalizedInviteEmail = invite.email.toLowerCase().trim();
      const normalizedUserEmail = user.linked_email?.toLowerCase().trim();
      if (!normalizedUserEmail || normalizedUserEmail !== normalizedInviteEmail) {
        return NextResponse.json(
          { error: 'This invitation is linked to a different email address.' },
          { status: 403 }
        );
      }
    }

    if (invite.phoneNumber) {
      const invitePhone = normalizePhone(invite.phoneNumber);
      const userPhone = user.phone_number ? normalizePhone(user.phone_number) : null;
      if (!invitePhone || !userPhone || userPhone !== invitePhone) {
        return NextResponse.json(
          { error: 'This invitation is linked to a different phone number.' },
          { status: 403 }
        );
      }
    }

    // One-family-at-a-time guard: require explicit confirmation for switches.
    if (user.household_id && user.household_id !== invite.householdId && !forceSwitch) {
      return NextResponse.json(
        {
          error: 'You are already in another family.',
          requiresConfirm: true,
        },
        { status: 409 }
      );
    }

    // 4. Accept the invite
    const success = await acceptInvite(userId, invite.inviteId, invite.householdId);

    if (!success) {
        return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logError('Invite claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
