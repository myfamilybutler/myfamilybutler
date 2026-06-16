import { NextRequest, NextResponse } from 'next/server';
import { declineInvite, getAdminClient, getInviteByToken, normalizePhone } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * POST /api/auth/invite-decline
 * Allows a logged-in user to decline an invite token.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: user } = await admin
      .from('users')
      .select('linked_email, phone_number')
      .eq('id', session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (invite.email) {
      const inviteEmail = invite.email.toLowerCase().trim();
      const userEmail = user.linked_email?.toLowerCase().trim();
      if (!userEmail || userEmail !== inviteEmail) {
        return NextResponse.json(
          { error: 'This invitation is linked to a different email address.' },
          { status: 403 }
        );
      }
    }

    if (invite.phoneNumber) {
      const invitePhone = normalizePhone(invite.phoneNumber);
      const userPhone = user.phone_number ? normalizePhone(user.phone_number) : null;
      if (!invitePhone || !userPhone || invitePhone !== userPhone) {
        return NextResponse.json(
          { error: 'This invitation is linked to a different phone number.' },
          { status: 403 }
        );
      }
    }

    // Open invites have no known recipient, so they cannot be declined by a
    // random logged-in user. They can only be revoked by the inviter.
    if (!invite.email && !invite.phoneNumber) {
      return NextResponse.json(
        { error: 'Open invites cannot be declined.' },
        { status: 403 }
      );
    }

    const success = await declineInvite(invite.inviteId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to decline invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Invite decline error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
