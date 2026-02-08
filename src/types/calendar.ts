/**
 * Shared calendar event type used across all calendar components.
 * Single source of truth to prevent type drift.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  end_time?: string;
  is_all_day: boolean;
  family_member?: string;
  family_member_id?: string;
  location?: string;
  description?: string;
  /** Source of the event: 'app' for local events, 'google' for Google Calendar */
  source?: 'app' | 'google';
}
