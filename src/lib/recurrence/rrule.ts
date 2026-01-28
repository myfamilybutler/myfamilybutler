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

const WEEKDAY_REVERSE: Record<number, Weekday> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
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
 * Expand a recurring event to instances within a date range
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
  let current = new Date(startDate);
  let count = 0;
  
  // Convert until date if present
  const untilDate = pattern.until ? new Date(pattern.until) : null;
  
  while (count < maxInstances) {
    // Check termination conditions
    if (untilDate && current > untilDate) break;
    if (pattern.count && count >= pattern.count) break;
    if (current > rangeEnd) break;
    
    // Check if current date matches the pattern
    if (matchesPattern(current, pattern, startDate)) {
      if (current >= rangeStart) {
        instances.push({ date: new Date(current) });
      }
      count++;
    }
    
    // Advance to next potential date
    current = advanceDate(current, pattern);
  }
  
  return instances;
}

/**
 * Check if a date matches the recurrence pattern
 */
function matchesPattern(
  date: Date,
  pattern: RecurrencePattern,
  startDate: Date
): boolean {
  const interval = pattern.interval || 1;
  
  switch (pattern.frequency) {
    case 'DAILY': {
      const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      return daysDiff >= 0 && daysDiff % interval === 0;
    }
    
    case 'WEEKLY': {
      const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksDiff < 0 || weeksDiff % interval !== 0) return false;
      
      if (pattern.byDay && pattern.byDay.length > 0) {
        const dayOfWeek = WEEKDAY_REVERSE[date.getDay()];
        return pattern.byDay.includes(dayOfWeek);
      }
      
      return date.getDay() === startDate.getDay();
    }
    
    case 'MONTHLY': {
      const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + 
                         (date.getMonth() - startDate.getMonth());
      if (monthsDiff < 0 || monthsDiff % interval !== 0) return false;
      
      if (pattern.byMonthDay && pattern.byMonthDay.length > 0) {
        return pattern.byMonthDay.includes(date.getDate());
      }
      
      return date.getDate() === startDate.getDate();
    }
    
    case 'YEARLY': {
      const yearsDiff = date.getFullYear() - startDate.getFullYear();
      if (yearsDiff < 0 || yearsDiff % interval !== 0) return false;
      
      if (pattern.byMonth && pattern.byMonth.length > 0) {
        if (!pattern.byMonth.includes(date.getMonth() + 1)) return false;
      } else if (date.getMonth() !== startDate.getMonth()) {
        return false;
      }
      
      return date.getDate() === startDate.getDate();
    }
    
    default:
      return false;
  }
}

/**
 * Advance date to next potential occurrence
 */
function advanceDate(date: Date, pattern: RecurrencePattern): Date {
  const next = new Date(date);
  
  switch (pattern.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 1);
      break;
    case 'MONTHLY':
      next.setDate(next.getDate() + 1);
      break;
    case 'YEARLY':
      next.setDate(next.getDate() + 1);
      break;
  }
  
  return next;
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
