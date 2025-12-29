/**
 * Calendar Helper Utilities
 * 
 * Helper functions for calendar grid calculations and event positioning.
 */
import {
  getISOWeek,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
  isBefore,
  isAfter,
  isSameDay,
  addDays,
  getDay,
} from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';

/**
 * Represents an event's position in the calendar grid.
 */
export interface EventPosition {
  event: CalendarEvent;
  row: number;        // Which week row (0-indexed)
  startCol: number;   // Starting column (1-7, Mon=1, Sun=7)
  span: number;       // Number of days to span (1-7)
  isStart: boolean;   // Is this the start of the event?
  isEnd: boolean;     // Is this the end of the event?
}

/**
 * Get ISO week number for a date.
 */
export function getWeekNumber(date: Date): number {
  return getISOWeek(date);
}

/**
 * Check if an event spans multiple days.
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  if (!event.end_time && !event.is_all_day) return false;
  // For now, we treat all-day events as single-day unless end_date is specified
  // Note: CalendarEvent doesn't have end_date, so multi-day support would need schema update
  return false;
}

/**
 * Convert day of week from JS (0=Sun) to ISO (1=Mon, 7=Sun).
 */
export function getISODayOfWeek(date: Date): number {
  const jsDay = getDay(date); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 7 : jsDay; // Convert to ISO: 1=Mon, ..., 7=Sun
}

/**
 * Get all calendar days for a month view (including overflow days from prev/next months).
 * Returns weeks starting from Monday.
 */
export function getCalendarDays(month: Date): Date[][] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Sunday
  
  const weeks = eachWeekOfInterval(
    { start: calendarStart, end: calendarEnd },
    { weekStartsOn: 1 }
  );
  
  return weeks.map(weekStart => 
    eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    })
  );
}

/**
 * Get the date range for a month's calendar view (including overflow days).
 */
export function getCalendarDateRange(month: Date): { start: Date; end: Date } {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  return {
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  };
}

/**
 * Calculate event positions for the calendar grid.
 * Handles multi-day events by splitting them across weeks if needed.
 * 
 * @param events - All events for the visible date range
 * @param weeks - Array of weeks (each week is array of 7 days)
 * @returns Array of EventPosition objects for rendering
 */
export function calculateEventPositions(
  events: CalendarEvent[],
  weeks: Date[][]
): EventPosition[] {
  const positions: EventPosition[] = [];
  
  if (weeks.length === 0) return positions;
  
  const calendarStart = weeks[0][0];
  const calendarEnd = weeks[weeks.length - 1][6];
  
  for (const event of events) {
    const eventDate = parseISO(event.event_date);
    
    // Skip events outside the visible range
    if (isBefore(eventDate, calendarStart) || isAfter(eventDate, calendarEnd)) {
      continue;
    }
    
    // Find which week row this event belongs to
    const rowIndex = weeks.findIndex(week => 
      week.some(day => isSameDay(day, eventDate))
    );
    
    if (rowIndex === -1) continue;
    
    // Get the column (1-7 for Mon-Sun)
    const col = getISODayOfWeek(eventDate);
    
    positions.push({
      event,
      row: rowIndex,
      startCol: col,
      span: 1, // Single day for now (multi-day requires end_date field)
      isStart: true,
      isEnd: true,
    });
  }
  
  // Sort by date, then by time (all-day events first)
  positions.sort((a, b) => {
    const dateCompare = a.event.event_date.localeCompare(b.event.event_date);
    if (dateCompare !== 0) return dateCompare;
    
    // All-day events come first
    if (a.event.is_all_day && !b.event.is_all_day) return -1;
    if (!a.event.is_all_day && b.event.is_all_day) return 1;
    
    // Then by time
    const timeA = a.event.event_time || '00:00';
    const timeB = b.event.event_time || '00:00';
    return timeA.localeCompare(timeB);
  });
  
  return positions;
}

/**
 * Group events by date for efficient lookup.
 */
export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  
  for (const event of events) {
    const dateKey = event.event_date;
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
    map.get(dateKey)!.push(event);
  }
  
  // Sort events within each day
  for (const [, dayEvents] of map) {
    dayEvents.sort((a, b) => {
      // All-day events first
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      // Then by time
      const timeA = a.event_time || '00:00';
      const timeB = b.event_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }
  
  return map;
}

/**
 * Format date for API query (YYYY-MM-DD).
 */
export function formatDateForQuery(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
