import { NextRequest, NextResponse } from 'next/server';
import { getInviteByToken, acceptInvite, getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';

/**
 * POST /api/auth/invite-claim
 * Allows a logged-in user to claim an open invite (or any invite) using a token.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

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
    const { data: user } = await admin.from('users').select('household_id').eq('id', userId).single();
    
    if (user?.household_id && user.household_id !== invite.householdId) {
        // Option: Fail and tell them to leave first? Or auto-switch?
        // User requested flow: "Ask for email/phone... then log in... then accept".
        // The safest is to Auto-Switch them or just link them.
        // db-families.ts `acceptInvite` updates the user's household_id, so it overwrites.
        // We should warn? For V1, let's just accept it (overwriting).
    }

    // 4. Accept the invite
    const success = await acceptInvite(userId, invite.inviteId, invite.householdId);

    if (!success) {
        return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Invite claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
