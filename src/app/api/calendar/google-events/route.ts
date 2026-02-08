import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/helpers';
import { fetchGoogleEvents } from '@/lib/sync/google';
import { hasGoogleToken } from '@/lib/auth/vault';
import { log } from '@/lib/utils/logger';

/**
 * GET /api/calendar/google-events
 * 
 * Fetches events from the user's Google Calendar.
 * Query params:
 *   - start: ISO date string (required)
 *   - end: ISO date string (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session
    let session;
    try {
      session = await validateSession();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Google Calendar connected
    const connected = await hasGoogleToken(session.userId);
    if (!connected) {
      return NextResponse.json({ 
        events: [],
        connected: false,
        message: 'Google Calendar not connected'
      });
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing required params: start, end' },
        { status: 400 }
      );
    }

    // Fetch events from Google Calendar
    const googleEvents = await fetchGoogleEvents(session.userId, start, end);

    // Transform to a simpler format for the frontend
    const events = googleEvents.map((event) => ({
      id: event.id,
      title: event.summary,
      description: event.description || null,
      location: event.location || null,
      // Extract date from dateTime or date field
      event_date: event.start.date || (event.start.dateTime ? event.start.dateTime.split('T')[0] : null),
      end_date: event.start.date
        ? (() => {
            if (!event.end.date) return event.start.date;
            const exclusiveEnd = new Date(`${event.end.date}T00:00:00`);
            if (Number.isNaN(exclusiveEnd.getTime())) return event.start.date;
            exclusiveEnd.setDate(exclusiveEnd.getDate() - 1);
            return exclusiveEnd.toISOString().slice(0, 10);
          })()
        : (event.end.dateTime ? event.end.dateTime.split('T')[0] : (event.start.dateTime ? event.start.dateTime.split('T')[0] : null)),
      // Extract time from dateTime
      event_time: event.start.dateTime ? event.start.dateTime.split('T')[1]?.slice(0, 5) : null,
      end_time: event.end.dateTime ? event.end.dateTime.split('T')[1]?.slice(0, 5) : null,
      is_all_day: !event.start.dateTime,
      // Mark as external Google event
      source: 'google' as const,
    }));

    return NextResponse.json({
      events,
      connected: true,
      count: events.length,
    });

  } catch (error) {
    log.error('[Google Events API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Calendar events' },
      { status: 500 }
    );
  }
}
