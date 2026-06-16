/**
 * RRULE Utilities - Phase 2.4
 * 
 * Utilities for working with RFC 5545 RRULE recurrence rules.
 * Converts between AI-extracted recurrence format and RRULE strings.
 */

// ===========================================
// Types
// ===========================================

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

/**
 * Recurrence pattern extracted by AI
 */
export interface RecurrencePattern {
  frequency: Frequency;
  interval?: number;       // Every N (default 1)
  byDay?: Weekday[];       // For WEEKLY: which days
  byMonthDay?: number[];   // For MONTHLY: which day of month (1-31)
  byMonth?: number[];      // For YEARLY: which months (1-12)
  count?: number;          // End after N occurrences
  until?: string;          // End on date (YYYY-MM-DD)
}

/**
 * Expanded event instance
 */
export interface EventInstance {
  date: Date;
  isException?: boolean;
}

// ===========================================
// Day Mapping
// ===========================================

const WEEKDAY_TO_NUMBER: Record<Weekday, number> = {
  'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0,
};

const GERMAN_DAYS: Record<string, Weekday> = {
  'montag': 'MO', 'mo': 'MO',
  'dienstag': 'TU', 'di': 'TU',
  'mittwoch': 'WE', 'mi': 'WE',
  'donnerstag': 'TH', 'do': 'TH',
  'freitag': 'FR', 'fr': 'FR',
  'samstag': 'SA', 'sa': 'SA',
  'sonntag': 'SU', 'so': 'SU',
};

// ===========================================
// Conversion Functions
// ===========================================

/**
 * Convert AI recurrence pattern to RRULE string
 * 
 * Examples:
 * { frequency: 'WEEKLY', byDay: ['MO'] } => "FREQ=WEEKLY;BYDAY=MO"
 * { frequency: 'MONTHLY', byMonthDay: [15] } => "FREQ=MONTHLY;BYMONTHDAY=15"
 */
export function recurrenceToRRule(pattern: RecurrencePattern): string {
  const parts: string[] = [`FREQ=${pattern.frequency}`];
  
  if (pattern.interval && pattern.interval > 1) {
    parts.push(`INTERVAL=${pattern.interval}`);
  }
  
  if (pattern.byDay && pattern.byDay.length > 0) {
    parts.push(`BYDAY=${pattern.byDay.join(',')}`);
  }
  
  if (pattern.byMonthDay && pattern.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${pattern.byMonthDay.join(',')}`);
  }
  
  if (pattern.byMonth && pattern.byMonth.length > 0) {
    parts.push(`BYMONTH=${pattern.byMonth.join(',')}`);
  }
  
  if (pattern.count) {
    parts.push(`COUNT=${pattern.count}`);
  }
  
  if (pattern.until) {
    // Convert YYYY-MM-DD to RRULE date format (YYYYMMDD)
    const untilDate = pattern.until.replace(/-/g, '');
    parts.push(`UNTIL=${untilDate}`);
  }
  
  return parts.join(';');
}

/**
 * Parse RRULE string to recurrence pattern
 */
export function parseRRule(rrule: string): RecurrencePattern | null {
  if (!rrule) return null;
  
  const parts = rrule.split(';');
  const pattern: Partial<RecurrencePattern> = {};
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    
    switch (key) {
      case 'FREQ':
        pattern.frequency = value as Frequency;
        break;
      case 'INTERVAL':
        pattern.interval = parseInt(value, 10);
        break;
      case 'BYDAY':
        pattern.byDay = value.split(',') as Weekday[];
        break;
      case 'BYMONTHDAY':
        pattern.byMonthDay = value.split(',').map(n => parseInt(n, 10));
        break;
      case 'BYMONTH':
        pattern.byMonth = value.split(',').map(n => parseInt(n, 10));
        break;
      case 'COUNT':
        pattern.count = parseInt(value, 10);
        break;
      case 'UNTIL':
        // Convert YYYYMMDD to YYYY-MM-DD
        pattern.until = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
        break;
    }
  }
  
  if (!pattern.frequency) return null;
  
  return pattern as RecurrencePattern;
}

/**
 * Parse German text to weekday
 */
export function parseGermanDay(text: string): Weekday | null {
  const lower = text.toLowerCase().trim();
  return GERMAN_DAYS[lower] || null;
}

// ===========================================
// Expansion Functions
// ===========================================

/**
 * Expand a recurring event to instances within a date range.
 *
 * Optimized to jump directly to candidate dates instead of scanning day-by-day.
 *
 * @param startDate - Event start date
 * @param rrule - RRULE string
 * @param rangeStart - Range start (inclusive)
 * @param rangeEnd - Range end (inclusive)
 * @param maxInstances - Maximum instances to return (default 100)
 */
export function expandRecurrence(
  startDate: Date,
  rrule: string,
  rangeStart: Date,
  rangeEnd: Date,
  maxInstances: number = 100
): EventInstance[] {
  const pattern = parseRRule(rrule);
  if (!pattern) return [];

  const instances: EventInstance[] = [];
  const interval = pattern.interval || 1;

  // Hard global ceiling: 5 years from dtstart, regardless of caller options
  const globalCeiling = new Date(startDate);
  globalCeiling.setFullYear(globalCeiling.getFullYear() + 5);

  const effectiveRangeEnd = rangeEnd < globalCeiling ? rangeEnd : globalCeiling;
  const untilDate = pattern.until ? new Date(pattern.until) : null;
  const instanceLimit = pattern.count ? Math.min(maxInstances, pattern.count) : maxInstances;

  switch (pattern.frequency) {
    case 'DAILY': {
      const current = new Date(startDate);
      let count = 0;
      while (count < instanceLimit) {
        if (untilDate && current > untilDate) break;
        if (current > effectiveRangeEnd) break;

        if (current >= rangeStart) {
          instances.push({ date: new Date(current) });
          count++;
        }
        current.setDate(current.getDate() + interval);
      }
      break;
    }

    case 'WEEKLY': {
      const startDayOfWeek = startDate.getDay();
      const targetDays = pattern.byDay && pattern.byDay.length > 0
        ? pattern.byDay.map(d => WEEKDAY_TO_NUMBER[d])
        : [startDayOfWeek];
      targetDays.sort((a, b) => a - b);

      let weekIndex = 0;
      let count = 0;
      while (count < instanceLimit) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + weekIndex * 7);

        if (untilDate && weekStart > untilDate) break;
        if (weekStart > effectiveRangeEnd) break;

        for (const targetDay of targetDays) {
          const offset = (targetDay - startDayOfWeek + 7) % 7;
          const candidate = new Date(weekStart);
          candidate.setDate(weekStart.getDate() + offset);

          if (candidate < startDate) continue;
          if (untilDate && candidate > untilDate) break;
          if (candidate > effectiveRangeEnd) break;

          if (candidate >= rangeStart) {
            instances.push({ date: new Date(candidate) });
            count++;
            if (count >= instanceLimit) break;
          }
        }

        weekIndex += interval;
      }
      break;
    }

    case 'MONTHLY': {
      const targetDays = pattern.byMonthDay && pattern.byMonthDay.length > 0
        ? [...pattern.byMonthDay].sort((a, b) => a - b)
        : [startDate.getDate()];

      let monthOffset = 0;
      let count = 0;
      while (count < instanceLimit) {
        const totalMonths = startDate.getMonth() + monthOffset;
        const candidateYear = startDate.getFullYear() + Math.floor(totalMonths / 12);
        const candidateMonth = totalMonths % 12;

        for (const targetDay of targetDays) {
          const candidate = new Date(candidateYear, candidateMonth, targetDay);
          if (candidate.getMonth() !== candidateMonth) continue;

          if (candidate < startDate) continue;
          if (untilDate && candidate > untilDate) break;
          if (candidate > effectiveRangeEnd) break;

          if (candidate >= rangeStart) {
            instances.push({ date: new Date(candidate) });
            count++;
            if (count >= instanceLimit) break;
          }
        }

        monthOffset += interval;

        const nextTotalMonths = startDate.getMonth() + monthOffset;
        const nextYear = startDate.getFullYear() + Math.floor(nextTotalMonths / 12);
        const nextMonth = nextTotalMonths % 12;
        const nextMonthStart = new Date(nextYear, nextMonth, 1);
        if (untilDate && nextMonthStart > untilDate) break;
        if (nextMonthStart > effectiveRangeEnd) break;
      }
      break;
    }

    case 'YEARLY': {
      const targetMonths = pattern.byMonth && pattern.byMonth.length > 0
        ? [...pattern.byMonth].sort((a, b) => a - b)
        : [startDate.getMonth() + 1];

      let yearOffset = 0;
      let count = 0;
      while (count < instanceLimit) {
        const candidateYear = startDate.getFullYear() + yearOffset;

        for (const targetMonth of targetMonths) {
          const candidate = new Date(candidateYear, targetMonth - 1, startDate.getDate());
          if (candidate.getMonth() !== targetMonth - 1) continue;

          if (candidate < startDate) continue;
          if (untilDate && candidate > untilDate) break;
          if (candidate > effectiveRangeEnd) break;

          if (candidate >= rangeStart) {
            instances.push({ date: new Date(candidate) });
            count++;
            if (count >= instanceLimit) break;
          }
        }

        yearOffset += interval;

        const nextYear = startDate.getFullYear() + yearOffset;
        const nextYearStart = new Date(nextYear, 0, 1);
        if (untilDate && nextYearStart > untilDate) break;
        if (nextYearStart > effectiveRangeEnd) break;
      }
      break;
    }
  }

  return instances;
}

// ===========================================
// Human-Readable Conversion
// ===========================================

/**
 * Convert RRULE to human-readable German text
 */
export function rruleToGerman(rrule: string): string {
  const pattern = parseRRule(rrule);
  if (!pattern) return '';
  
  const interval = pattern.interval || 1;
  
  switch (pattern.frequency) {
    case 'DAILY':
      return interval === 1 ? 'Täglich' : `Alle ${interval} Tage`;
      
    case 'WEEKLY': {
      if (pattern.byDay && pattern.byDay.length > 0) {
        const dayNames: Record<Weekday, string> = {
          'MO': 'Montag', 'TU': 'Dienstag', 'WE': 'Mittwoch',
          'TH': 'Donnerstag', 'FR': 'Freitag', 'SA': 'Samstag', 'SU': 'Sonntag',
        };
        const days = pattern.byDay.map(d => dayNames[d]).join(', ');
        return interval === 1 
          ? `Jeden ${days}` 
          : `Alle ${interval} Wochen: ${days}`;
      }
      return interval === 1 ? 'Wöchentlich' : `Alle ${interval} Wochen`;
    }
    
    case 'MONTHLY': {
      if (pattern.byMonthDay && pattern.byMonthDay.length > 0) {
        const days = pattern.byMonthDay.join(', ');
        return interval === 1 
          ? `Monatlich am ${days}.` 
          : `Alle ${interval} Monate am ${days}.`;
      }
      return interval === 1 ? 'Monatlich' : `Alle ${interval} Monate`;
    }
    
    case 'YEARLY':
      return interval === 1 ? 'Jährlich' : `Alle ${interval} Jahre`;
      
    default:
      return rrule;
  }
}

/**
 * Convert RRULE to human-readable English text
 */
export function rruleToEnglish(rrule: string): string {
  const pattern = parseRRule(rrule);
  if (!pattern) return '';
  
  const interval = pattern.interval || 1;
  
  switch (pattern.frequency) {
    case 'DAILY':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
      
    case 'WEEKLY': {
      if (pattern.byDay && pattern.byDay.length > 0) {
        const dayNames: Record<Weekday, string> = {
          'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday',
          'TH': 'Thursday', 'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday',
        };
        const days = pattern.byDay.map(d => dayNames[d]).join(', ');
        return interval === 1 
          ? `Every ${days}` 
          : `Every ${interval} weeks on ${days}`;
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
    }
    
    case 'MONTHLY': {
      if (pattern.byMonthDay && pattern.byMonthDay.length > 0) {
        const days = pattern.byMonthDay.join(', ');
        return interval === 1 
          ? `Monthly on the ${days}th` 
          : `Every ${interval} months on the ${days}th`;
      }
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;
    }
    
    case 'YEARLY':
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;
      
    default:
      return rrule;
  }
}

/**
 * Get human-readable recurrence text based on language
 */
export function rruleToHuman(rrule: string, language: 'de' | 'en' = 'de'): string {
  return language === 'de' ? rruleToGerman(rrule) : rruleToEnglish(rrule);
}
