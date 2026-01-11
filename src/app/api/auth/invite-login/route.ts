import { NextRequest, NextResponse } from 'next/server';
import { getInviteByToken, findOrCreateUserByEmail, acceptInvite } from '@/lib/supabase';

/**
 * POST /api/auth/invite-login
 * 
 * Exchanges an invite token for a session.
 * Used when a user clicks an invitation link.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Verify token
    const invite = await getInviteByToken(token);
    
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // 2. We need an email to identify the user (for email invites)
    // QR invites (phone based) usually require the user to already exist or use WhatsApp flow.
    // This auto-login is primarily for email invites.
    // 2. We need an email to identify the user (for email invites)
    // If no email, this is an Open Invite -> Requires manual login/register
    if (!invite.email) {
       return NextResponse.json({ 
         success: false, 
         requiresAuth: true 
       }, { status: 200 });
    }

    // 3. Find or Create User
    const { user, isNewUser } = await findOrCreateUserByEmail(invite.email);
    
    if (!user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 4. Accept the invite automatically
    // Doing this here ensures that even if they bounce after login, they are in the family.
    await acceptInvite(user.id, invite.inviteId, invite.householdId);

    // 5. Create Session (Set Cookies)
    // We can't use `cookies()` from next/headers in API route comfortably for setting *response* cookies
    // but NextResponse works fine.
    
    const response = NextResponse.json({ 
        success: true, 
        userId: user.id,
        isNewUser
    });

    const opts = { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax' as const, 
        path: '/', 
        maxAge: 7776000 // 90 days
    };
      
    response.cookies.set('session_authenticated', 'true', opts);
    response.cookies.set('session_user_id', user.id, opts);

    return response;

  } catch (error) {
    console.error('Invite login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
