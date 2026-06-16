import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';

/**
 * GET - Export user data (GDPR: Right to data portability)
 * SECURITY: Uses validateSession() to get userId from session, not client input
 */
export async function GET() {
  try {
    // SECURITY: Validate session and get userId from server, NOT from client
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { userId } = session;
    const admin = getAdminClient();
    
    // Get user using validated session userId
    const { data: user, error: userError } = await admin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get user's messages
    const { data: messages } = await admin
      .from('messages')
      .select('role, content, type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    // Get user's reminders
    const { data: reminders } = await admin
      .from('reminders')
      .select('message, remind_at, status, created_at')
      .eq('user_id', user.id);
    
    // Get household data if exists
    let householdData = null;
    if (user.household_id) {
      const { data: household } = await admin
        .from('households')
        .select('name, created_at')
        .eq('id', user.household_id)
        .single();
      
      const { data: events } = await admin
        .from('events')
        .select('title, event_date, event_time, is_all_day, family_member, family_member_id, location, description, created_at')
        .eq('household_id', user.household_id);
      
      const { data: familyMembers } = await admin
        .from('family_members')
        .select('id, name')
        .eq('household_id', user.household_id);

      const familyMemberNameById = new Map(
        (familyMembers || []).map((member) => [member.id, member.name])
      );
      const hydratedEvents = (events || []).map((event) => ({
        ...event,
        family_member: event.family_member_id
          ? familyMemberNameById.get(event.family_member_id) || event.family_member
          : event.family_member,
      }));
      
      householdData = {
        name: household?.name,
        events: hydratedEvents,
        familyMembers: familyMembers?.map(m => m.name) || []
      };
    }
    
    // Build export
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        email: user.linked_email,
        phoneNumber: user.phone_number,
        displayName: user.display_name,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      },
      messages: messages || [],
      reminders: reminders || [],
      household: householdData
    };
    
    return NextResponse.json(exportData);
  } catch (error) {
    logError('Export data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
