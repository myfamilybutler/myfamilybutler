import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { getValidGoogleToken } from '@/lib/auth/vault';

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
    const accessToken = await getValidGoogleToken(session.userId);

    if (!accessToken) {
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
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Google] Failed to fetch calendars:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch calendars' },
        { status: 500 }
      );
    }

    const data = await response.json() as GoogleCalendarListResponse;

    // Filter to calendars where user can write (owner or writer role)
    const writableCalendars = (data.items || [])
      .filter(cal => ['owner', 'writer'].includes(cal.accessRole))
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
    console.error('[Google OAuth] Calendar list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}
