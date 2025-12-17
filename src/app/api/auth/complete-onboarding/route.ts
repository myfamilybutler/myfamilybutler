import { NextRequest, NextResponse } from 'next/server';
import { 
  updateOnboardingCompleted, 
  createFamilyForUser,
  checkPendingInvite,
  acceptInvite 
} from '@/lib/supabase';
import { getAdminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId, displayName, familyMembers, phoneNumber } = await request.json();
    
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: 'Missing supabaseUserId' },
        { status: 400 }
      );
    }
    
    const admin = getAdminClient();
    
    // Get user by supabase_user_id
    const { data: user, error: userError } = await admin
      .from('users')
      .select('id, phone_number, household_id')
      .eq('supabase_user_id', supabaseUserId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update phone number if provided during onboarding
    // AND check if there's an existing phone-based user to merge
    if (phoneNumber) {
      // Check if another user exists with this phone number
      const { data: existingPhoneUser } = await admin
        .from('users')
        .select('id, household_id, telegram_chat_id')
        .eq('phone_number', phoneNumber)
        .neq('id', user.id)
        .single();
      
      if (existingPhoneUser) {
        console.log(`[Onboarding] Merging phone-based user ${existingPhoneUser.id} into ${user.id}`);
        
        // Transfer events from old user to new user
        await admin
          .from('events')
          .update({ created_by: user.id })
          .eq('created_by', existingPhoneUser.id);
        
        // Transfer messages from old user to new user
        await admin
          .from('messages')
          .update({ user_id: user.id })
          .eq('user_id', existingPhoneUser.id);
        
        // Transfer reminders from old user to new user
        await admin
          .from('reminders')
          .update({ user_id: user.id })
          .eq('user_id', existingPhoneUser.id);
        
        // If user had a family and we don't, take their family
        let userFamilyId = user.household_id;
        if (!userFamilyId && existingPhoneUser.household_id) {
          userFamilyId = existingPhoneUser.household_id;
        }
        
        // Update current user with phone and telegram info from old user
        await admin
          .from('users')
          .update({ 
            phone_number: phoneNumber,
            telegram_chat_id: existingPhoneUser.telegram_chat_id,
            household_id: userFamilyId || undefined,
          })
          .eq('id', user.id);
        
        // Delete the old phone-based user (now orphaned)
        await admin
          .from('users')
          .delete()
          .eq('id', existingPhoneUser.id);
        
        console.log(`[Onboarding] Successfully merged users`);
        
        // Update user.household_id for next steps
        user.household_id = userFamilyId;
      } else {
        // No existing phone user, just update phone number
        await admin
          .from('users')
          .update({ phone_number: phoneNumber })
          .eq('id', user.id);
      }
    }
    
    // Check if user already has a family
    if (!user.household_id) {
      // Check for pending invite first (if phone number was provided)
      if (phoneNumber) {
        const pendingInvite = await checkPendingInvite(phoneNumber);
        
        if (pendingInvite) {
          // Accept the invite and join that family
          await acceptInvite(user.id, pendingInvite.inviteId, pendingInvite.householdId);
        } else {
          // Create new family for this user
          const familyId = await createFamilyForUser(user.id, displayName);
          
          if (!familyId) {
            return NextResponse.json(
              { error: 'Failed to create family' },
              { status: 500 }
            );
          }
          
          // Add family members if provided
          if (familyMembers && familyMembers.length > 0) {
            for (const member of familyMembers) {
              if (member.name) {
                await admin
                  .from('family_members')
                  .insert({ household_id: familyId, name: member.name });
              }
            }
          }
        }
      } else {
        // No phone number, just create family
        const familyId = await createFamilyForUser(user.id, displayName);
        
        if (!familyId) {
          return NextResponse.json(
            { error: 'Failed to create family' },
            { status: 500 }
          );
        }
        
        // Add family members if provided
        if (familyMembers && familyMembers.length > 0) {
          for (const member of familyMembers) {
            if (member.name) {
              await admin
                .from('family_members')
                .insert({ household_id: familyId, name: member.name });
            }
          }
        }
      }
    }
    
    // Mark onboarding as complete
    const success = await updateOnboardingCompleted(supabaseUserId);
    
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
