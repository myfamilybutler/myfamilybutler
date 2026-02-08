import { NextRequest, NextResponse } from 'next/server';
import { resolveInviteByToken, getAdminClient, normalizePhone } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { maskPhone } from '@/lib/utils/security';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  if (local.length <= 2) {
    return `${local[0] ?? '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * GET /api/invite/resolve?token=...
 * Returns invite metadata and current-user eligibility for accept/decline.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invite = await resolveInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    }

    let sessionUserId: string | null = null;
    try {
      const session = await validateSession();
      sessionUserId = session.userId;
    } catch {
      // Not logged in is valid for resolve endpoint.
    }

    let isTargetMatch = false;
    if (sessionUserId) {
      const admin = getAdminClient();
      const { data: user } = await admin
        .from('users')
        .select('linked_email, phone_number')
        .eq('id', sessionUserId)
        .single();

      if (user) {
        if (invite.email) {
          isTargetMatch =
            (user.linked_email?.toLowerCase().trim() ?? '') === invite.email.toLowerCase().trim();
        } else if (invite.phoneNumber) {
          const invitePhone = normalizePhone(invite.phoneNumber);
          const userPhone = user.phone_number ? normalizePhone(user.phone_number) : null;
          isTargetMatch = !!invitePhone && !!userPhone && invitePhone === userPhone;
        } else {
          isTargetMatch = true;
        }
      }
    }

    const isOpenInvite = !invite.email && !invite.phoneNumber;
    const channel = invite.email ? 'email' : invite.phoneNumber ? 'phone' : 'open';
    const canAutoLogin = !sessionUserId && !!invite.email;
    const canRespond = Boolean(
      sessionUserId && invite.status === 'pending' && (isOpenInvite || isTargetMatch)
    );

    return NextResponse.json({
      success: true,
      invite: {
        inviteId: invite.inviteId,
        status: invite.status,
        householdId: invite.householdId,
        householdName: invite.householdName ?? 'Family',
        inviterName: invite.inviterDisplayName ?? 'Family member',
        channel,
        isOpenInvite,
        expiresAt: invite.expiresAt ?? null,
        target: {
          emailMasked: invite.email ? maskEmail(invite.email) : null,
          phoneMasked: invite.phoneNumber ? maskPhone(invite.phoneNumber) : null,
        },
      },
      auth: {
        isLoggedIn: !!sessionUserId,
        canAutoLogin,
      },
      eligibility: {
        canRespond,
        isTargetMatch: isOpenInvite ? true : isTargetMatch,
      },
    });
  } catch (error) {
    console.error('Invite resolve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
