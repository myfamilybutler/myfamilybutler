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
  recurrence_rule?: string | null;
  recurrence_end?: string | null;
  parent_event_id?: string | null;
  is_exception?: boolean;
  family_member?: string;
  family_member_id?: string;
  location?: string;
  description?: string;
  /** Runtime-only fields for expanded recurring instances */
  recurrence_parent_id?: string;
  recurrence_instance_date?: string;
  is_recurring_instance?: boolean;
  /** Source of the event: 'app' for local events, 'google' for Google Calendar */
  source?: 'app' | 'google';
}
