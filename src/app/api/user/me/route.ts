
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId, email } = await request.json();

    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Missing supabaseUserId' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Try finding by Supabase User ID
    let { data: user } = await supabase
      .from('users')
      .select('id, household_id, supabase_user_id')
      .eq('supabase_user_id', supabaseUserId)
      .maybeSingle();

    // 2. Self-Healing: If not found but email provided, try linking
    if (!user && email) {
      console.log(`[API] User not found by UID. Trying email match: ${email}`);

      const { data: emailUser } = await supabase
        .from('users')
        .select('id, household_id, supabase_user_id')
        .eq('email', email)
        .maybeSingle();

      if (emailUser) {
        console.log(`[API] Found user by email ${emailUser.id}. Linking to UID ${supabaseUserId}...`);
        
        // Update the user with the Supabase User ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ supabase_user_id: supabaseUserId })
          .eq('id', emailUser.id);

        if (updateError) {
          console.error('[API] Failed to link user:', updateError);
          return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
        }

        // Return the found user (now linked)
        user = { ...emailUser, supabase_user_id: supabaseUserId };
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
