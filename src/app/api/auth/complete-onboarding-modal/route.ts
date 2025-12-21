/**
 * POST /api/auth/complete-onboarding-modal
 * 
 * Handle the optional profile completion modal shown on first dashboard visit.
 * Accepts display name, family members, and email for linking.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';

interface OnboardingModalRequest {
    displayName?: string;
    familyMembers?: { name: string }[];
    linkedEmail?: string;
    skipped?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        // Get user from session cookie
        const cookieStore = await cookies();
        const userId = cookieStore.get('session_user_id')?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body: OnboardingModalRequest = await request.json();
        const admin = getAdminClient();

        // If just skipping, mark modal as shown and return
        if (body.skipped) {
            await admin
                .from('users')
                .update({ onboarding_modal_shown: true })
                .eq('id', userId);


            return NextResponse.json({ success: true });
        }

        // Build update object
        const updates: Record<string, unknown> = {
            onboarding_modal_shown: true,
        };

        if (body.displayName?.trim()) {
            updates.display_name = body.displayName.trim();
        }

        if (body.linkedEmail?.trim()) {
            const email = body.linkedEmail.toLowerCase().trim();

            // Check if email is already linked to another user
            const { data: existingUser } = await admin
                .from('users')
                .select('id')
                .eq('linked_email', email)
                .neq('id', userId)
                .maybeSingle();

            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'Diese Email ist bereits mit einem anderen Konto verknüpft.' },
                    { status: 400 }
                );
            }

            updates.linked_email = email;
        }

        // Update user
        const { error: updateError } = await admin
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (updateError) {
            console.error('[Onboarding Modal] Update error:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update profile' },
                { status: 500 }
            );
        }

        // Handle family members
        if (body.familyMembers && body.familyMembers.length > 0) {
            // Get or create household for user
            const { data: user } = await admin
                .from('users')
                .select('household_id')
                .eq('id', userId)
                .single();

            let householdId = user?.household_id;

            // Create household if user doesn't have one
            if (!householdId) {
                const { data: household } = await admin
                    .from('households')
                    .insert({ name: body.displayName ? `${body.displayName}'s Family` : 'Familie' })
                    .select('id')
                    .single();

                if (household) {
                    householdId = household.id;
                    await admin
                        .from('users')
                        .update({ household_id: householdId })
                        .eq('id', userId);
                }
            }

            // Add family members (batch insert to avoid N+1)
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

        console.log(`[Onboarding Modal] Completed for user: ${userId}`);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Onboarding Modal] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
