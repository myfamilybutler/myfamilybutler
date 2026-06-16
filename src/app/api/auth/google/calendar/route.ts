import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { setSelectedCalendar, getValidGoogleToken } from '@/lib/auth/vault';
import { logError } from '@/lib/utils/logger';

interface CalendarSelectRequest {
  calendarId: string;
  calendarName: string;
}

interface GoogleCalendarListItem {
  id: string;
  accessRole: string;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListItem[];
}

/**
 * POST /api/auth/google/calendar
 * 
 * Save the user's selected Google Calendar for sync.
 * Validates that the user has write access to the calendar.
 */
export async function POST(request: Request) {
  try {
    const session = await validateSession();

    // Check if Google is connected
    const accessToken = await getValidGoogleToken(session.userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 401 }
      );
    }

    const body = await request.json() as CalendarSelectRequest;

    if (!body.calendarId || !body.calendarName) {
      return NextResponse.json(
        { error: 'calendarId and calendarName are required' },
        { status: 400 }
      );
    }

    // Validate user has access to this calendar
    const calendarListResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calendarListResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to validate calendar access' },
        { status: 500 }
      );
    }

    const calendarList = await calendarListResponse.json() as GoogleCalendarListResponse;
    const userCalendars = calendarList.items || [];
    
    // Check if user has write access to the requested calendar
    const hasAccess = userCalendars.some(
      cal => cal.id === body.calendarId && ['owner', 'writer'].includes(cal.accessRole)
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have write access to this calendar' },
        { status: 403 }
      );
    }

    const success = await setSelectedCalendar(
      session.userId,
      body.calendarId,
      body.calendarName
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save calendar selection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      calendarId: body.calendarId,
      calendarName: body.calendarName,
    });

  } catch (error) {
    logError('[Google OAuth] Calendar select error:', error);
    return NextResponse.json(
      { error: 'Failed to save calendar selection' },
      { status: 500 }
    );
  }
}

