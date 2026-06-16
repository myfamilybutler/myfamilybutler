/**
 * POST /api/auth/complete-onboarding-modal
 *
 * Handle the optional profile completion modal shown on first dashboard visit.
 * Accepts display name, family members, and email for linking.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase';
import { log, logError } from '@/lib/utils/logger';

interface OnboardingModalRequest {
  displayName?: string;
  familyMembers?: { name: string }[];
  skipped?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const body: OnboardingModalRequest = await request.json();
    const admin = getAdminClient();

    if (body.skipped) {
      await admin
        .from('users')
        .update({ onboarding_modal_shown: true, onboarding_completed: true })
        .eq('id', userId);

      return NextResponse.json({ success: true });
    }

    const updates: Record<string, unknown> = {
      onboarding_modal_shown: true,
      onboarding_completed: true,
    };

    if (body.displayName?.trim()) {
      updates.display_name = body.displayName.trim();
    }

    // SECURITY: Do not persist unverified client-supplied linked_email.
    // Only copy the email from the authenticated Supabase Auth session, which
    // is already verified and belongs to the current user.
    if (user.email?.trim()) {
      updates.linked_email = user.email.toLowerCase().trim();
    }

    const { error: updateError } = await admin
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      logError('[Onboarding Modal] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    if (body.familyMembers && body.familyMembers.length > 0) {
      const { data: user } = await admin
        .from('users')
        .select('household_id')
        .eq('id', userId)
        .single();

      let householdId = user?.household_id;

      if (!householdId) {
        const { data: createdHouseholdId, error: rpcError } = await admin.rpc(
          'create_household_for_user',
          {
            p_user_id: userId,
            p_household_name: body.displayName ? `${body.displayName}'s Family` : 'Familie',
          }
        );

        if (rpcError || !createdHouseholdId) {
          log.error('[Onboarding Modal] Failed to create household:', rpcError);
          return NextResponse.json(
            { success: false, error: 'Failed to create family' },
            { status: 500 }
          );
        }

        householdId = createdHouseholdId;
      }

      if (householdId) {
        const validMembers = body.familyMembers
          .filter(m => m.name.trim())
          .map(m => ({
            household_id: householdId,
            name: m.name.trim(),
          }));

        if (validMembers.length > 0) {
          await admin
            .from('family_members')
            .insert(validMembers);
        }
      }
    }

    log.info(`[Onboarding Modal] Completed for user: ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    logError('[Onboarding Modal] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
