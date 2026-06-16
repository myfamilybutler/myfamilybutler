import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { getAdminClient } from '@/lib/supabase';
import { logError } from '@/lib/utils/logger';

function isMissingEventIdColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    (message.includes('event_id') &&
      (message.includes('schema cache') || message.includes('column') || message.includes('does not exist')))
  );
}

/**
 * GET /api/reminders
 * Query params:
 * - eventId?: string (UUID)
 */
export async function GET(request: NextRequest) {
  try {
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const admin = getAdminClient();

    let query = admin
      .from('reminders')
      .select('id, event_id, message, remind_at, status, created_at')
      .eq('user_id', session.userId)
      .neq('status', 'cancelled')
      .order('remind_at', { ascending: true });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    let { data, error } = await query;

    if (isMissingEventIdColumnError(error)) {
      // Backward-compatibility fallback for older schemas without reminders.event_id.
      // If caller requested a specific event, we cannot reliably filter, so return no matches.
      if (eventId) {
        return NextResponse.json({ success: true, data: [] });
      }

      const fallback = await admin
        .from('reminders')
        .select('id, message, remind_at, status, created_at')
        .eq('user_id', session.userId)
        .neq('status', 'cancelled')
        .order('remind_at', { ascending: true });

      data = (fallback.data || []).map((row) => ({
        ...row,
        event_id: null,
      }));
      error = fallback.error;
    }

    if (error) {
      logError('[API/reminders] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    logError('[API/reminders] GET internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/reminders?id=<reminder-id>
 * Cancels a pending reminder for the current user.
 */
export async function DELETE(request: NextRequest) {
  try {
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get('id');

    if (!reminderId) {
      return NextResponse.json({ error: 'Missing reminder id' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from('reminders')
      .update({ status: 'cancelled' })
      .eq('id', reminderId)
      .eq('user_id', session.userId)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (error || !data) {
      if (error) {
        logError('[API/reminders] DELETE error:', error);
      }
      return NextResponse.json({ error: 'Reminder not found or already processed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('[API/reminders] DELETE internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
