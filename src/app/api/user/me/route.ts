
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// Helper to sanitize phone numbers (strip + and spaces)
function sanitizePhone(phone: string) {
  return phone.replace(/[+\s]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, phoneNumber } = await request.json();

    if (!firebaseUid) {
      return NextResponse.json({ error: 'Missing firebaseUid' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Try finding by Firebase UID
    let { data: user } = await supabase
      .from('users')
      .select('id, household_id, firebase_uid')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    // 2. Self-Healing: If not found but phone provided, try linking
    if (!user && phoneNumber) {
      const cleanPhone = sanitizePhone(phoneNumber);
      console.log(`[API] User not found by UID. Trying phone match: ${cleanPhone}`);

      const { data: phoneUser } = await supabase
        .from('users')
        .select('id, household_id, firebase_uid')
        .eq('phone_number', cleanPhone)
        .maybeSingle();

      if (phoneUser) {
        console.log(`[API] Found user by phone ${phoneUser.id}. Linking to UID ${firebaseUid}...`);
        
        // Update the user with the Firebase UID
        const { error: updateError } = await supabase
          .from('users')
          .update({ firebase_uid: firebaseUid })
          .eq('id', phoneUser.id);

        if (updateError) {
          console.error('[API] Failed to link user:', updateError);
          return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
        }

        // Return the found user (now linked)
        user = { ...phoneUser, firebase_uid: firebaseUid };
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
    
  } catch (error) {
    console.error('[API] /api/user/me error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
