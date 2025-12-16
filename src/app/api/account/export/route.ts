import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * GET - Export user data (GDPR: Right to data portability)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUid = searchParams.get('firebaseUid');
    
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Missing firebaseUid' }, { status: 400 });
    }
    
    const admin = getAdminClient();
    
    // Get user
    const { data: user, error: userError } = await admin
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
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
        .select('title, event_date, event_time, is_all_day, family_member, location, description, created_at')
        .eq('household_id', user.household_id);
      
      const { data: familyMembers } = await admin
        .from('family_members')
        .select('name')
        .eq('household_id', user.household_id);
      
      householdData = {
        name: household?.name,
        events: events || [],
        familyMembers: familyMembers?.map(m => m.name) || []
      };
    }
    
    // Build export
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
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
    console.error('Export data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
