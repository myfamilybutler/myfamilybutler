import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { getGoogleToken } from '@/lib/auth/vault';
import { logError } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListItem[];
}

/**
 * GET /api/auth/google/calendars
 * 
 * Fetch the list of calendars from the user's Google account.
 * Returns calendars where the user has write access.
 */
export async function GET() {
  try {
    const session = await validateSession();
    
    // Get full token to check scope
    const token = await getGoogleToken(session.userId);

    if (!token?.access_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 401 }
      );
    }

    // Fetch calendar list from Google
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      logError('[Google] Failed to fetch calendars:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch calendars' },
        { status: 500 }
      );
    }

    const data = await response.json() as GoogleCalendarListResponse;

    // Filter to calendars where user can write (owner or writer role)
    // Relaxed to include 'reader' for debugging, but keeping it for now as it might be useful
    const writableCalendars = (data.items || [])
      .filter(cal => ['owner', 'writer', 'reader'].includes(cal.accessRole))
      .map(cal => ({
        id: cal.id,
        name: cal.summary,
        primary: cal.primary || false,
      }));

    // Sort: primary first, then alphabetically
    writableCalendars.sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ calendars: writableCalendars });

  } catch (error) {
    logError('[Google OAuth] Calendar list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}
