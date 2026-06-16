
import { NextResponse } from 'next/server';
import { createOpenInvite, getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { log } from '@/lib/utils/logger';
import { checkRateLimit } from '@/lib/core/rate-limit';

/**
 * POST - Generate a QR code invite token
 * Returns { token: string }
 */
export async function POST() {
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
    const { data: user, error } = await admin
      .from('users')
      .select('id, household_id, is_household_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
    }

    if (!user.is_household_admin) {
      return NextResponse.json({ error: 'Only household admin can create invites' }, { status: 403 });
    }

    const rateKey = `invite:qr:${user.household_id}`;
    const allowed = await checkRateLimit(rateKey, 5 * 60 * 1000, 10);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many invites. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Generate Open Invite
    const token = await createOpenInvite(user.household_id, user.id);
    
    if (!token) {
      return NextResponse.json({ error: 'Failed to create QR invite' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      token: token
    });
    
  } catch (error) {
    log.error('QR Invite generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
