
import { NextResponse } from 'next/server';
import { createOpenInvite, getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { log } from '@/lib/utils/logger';

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
      .select('id, household_id, is_admin')
      .eq('id', userId)
      .single();
    
    if (error || !user?.household_id) {
      return NextResponse.json({ error: 'User or family not found' }, { status: 404 });
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
