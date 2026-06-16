import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { hasGoogleToken, getSelectedCalendar } from '@/lib/auth/vault';
import { logError } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/status
 * 
 * Check if the current user has connected Google Calendar.
 * Also returns the selected calendar info if connected.
 */
export async function GET() {
  try {
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const connected = await hasGoogleToken(session.userId);

    if (!connected) {
      return NextResponse.json({ connected: false });
    }

    // Get selected calendar info
    const { calendarId, calendarName } = await getSelectedCalendar(session.userId);

    return NextResponse.json({ 
      connected: true,
      calendarId,
      calendarName,
    });

  } catch (error) {
    logError('[Google OAuth] Status check error:', error);
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
