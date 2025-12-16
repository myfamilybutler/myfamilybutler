import { NextRequest, NextResponse } from 'next/server';
import { 
  updateOnboardingCompleted, 
  createHouseholdForUser,
  checkPendingInvite,
  acceptInvite 
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, displayName, familyMembers } = await request.json();
    
    if (!firebaseUid) {
      return NextResponse.json(
        { error: 'Missing firebaseUid' },
        { status: 400 }
      );
    }
    
    const admin = getAdminClient();
    
    // Get user by firebase_uid
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, phone_number, household_id')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user already has a household
    if (!user.household_id) {
      // Check for pending invite first
      const pendingInvite = await checkPendingInvite(user.phone_number);
      
      if (pendingInvite) {
        // Accept the invite and join that household
        await acceptInvite(user.id, pendingInvite.inviteId, pendingInvite.householdId);
      } else {
        // Create new household for this user
        const householdId = await createHouseholdForUser(user.id, displayName);
        
        if (!householdId) {
          return NextResponse.json(
            { error: 'Failed to create household' },
            { status: 500 }
          );
        }
        
        // Add family members if provided
        if (familyMembers && familyMembers.length > 0) {
          for (const member of familyMembers) {
            if (member.name) {
              await admin
                .from('family_members')
                .insert({ household_id: householdId, name: member.name });
            }
          }
        }
      }
    }
    
    // Mark onboarding as complete
    const success = await updateOnboardingCompleted(firebaseUid);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update onboarding status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
