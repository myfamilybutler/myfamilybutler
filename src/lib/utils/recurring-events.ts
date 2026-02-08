import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { expandRecurrence } from '@/lib/recurrence';
import { getEventEndDate } from './calendar-helpers';
import { RECURRENCE_CANCELLED_MARKER } from '@/lib/recurrence/constants';
import type { CalendarEvent } from '@/types/calendar';

const DEFAULT_PAST_MONTHS = 2;
const DEFAULT_FUTURE_MONTHS = 12;
const DEFAULT_MAX_INSTANCES = 500;

interface ExpandOptions {
  pastMonths?: number;
  futureMonths?: number;
  maxInstances?: number;
}

function normalizeRule(rule: string | null | undefined): string | null {
  if (!rule) return null;
  return rule.startsWith('RRULE:') ? rule.slice('RRULE:'.length) : rule;
}

function getExpansionWindow(options?: ExpandOptions): { start: Date; end: Date } {
  const now = new Date();
  const pastMonths = options?.pastMonths ?? DEFAULT_PAST_MONTHS;
  const futureMonths = options?.futureMonths ?? DEFAULT_FUTURE_MONTHS;
  return {
    start: startOfMonth(subMonths(now, pastMonths)),
    end: endOfMonth(addMonths(now, futureMonths)),
  };
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.event_date.localeCompare(b.event_date);
    if (byDate !== 0) return byDate;

    if (a.is_all_day && !b.is_all_day) return -1;
    if (!a.is_all_day && b.is_all_day) return 1;

    const byTime = (a.event_time || '00:00').localeCompare(b.event_time || '00:00');
    if (byTime !== 0) return byTime;

    return a.title.localeCompare(b.title);
  });
}

export function expandRecurringCalendarEvents(
  events: CalendarEvent[],
  options?: ExpandOptions
): CalendarEvent[] {
  if (events.length === 0) return events;

  const regularEvents: CalendarEvent[] = [];
  const recurringParents: CalendarEvent[] = [];
  const exceptionsByParent = new Map<string, CalendarEvent[]>();
  const visibleExceptions: CalendarEvent[] = [];

  for (const event of events) {
    if (event.parent_event_id) {
      const list = exceptionsByParent.get(event.parent_event_id) || [];
      list.push(event);
      exceptionsByParent.set(event.parent_event_id, list);

      if (event.description !== RECURRENCE_CANCELLED_MARKER) {
        visibleExceptions.push(event);
      }
      continue;
    }

    if (event.recurrence_rule) {
      recurringParents.push(event);
      continue;
    }

    regularEvents.push(event);
  }

  const expanded: CalendarEvent[] = [];
  const { start, end } = getExpansionWindow(options);
  const maxInstances = options?.maxInstances ?? DEFAULT_MAX_INSTANCES;

  for (const parent of recurringParents) {
    const normalizedRule = normalizeRule(parent.recurrence_rule);
    if (!normalizedRule) {
      regularEvents.push(parent);
      continue;
    }

    const parentStart = parseISO(parent.event_date);
    if (!isValid(parentStart)) {
      regularEvents.push(parent);
      continue;
    }

    const parentEnd = parseISO(getEventEndDate(parent));
    const durationDays =
      isValid(parentEnd) && parentEnd >= parentStart
        ? differenceInCalendarDays(parentEnd, parentStart)
        : 0;

    const parentExceptions = exceptionsByParent.get(parent.id) || [];
    const skippedDates = new Set(parentExceptions.map((exception) => exception.event_date));

    const instances = expandRecurrence(parentStart, normalizedRule, start, end, maxInstances);
    if (instances.length === 0) {
      regularEvents.push(parent);
      continue;
    }

    for (const instance of instances) {
      const occurrenceDate = format(instance.date, 'yyyy-MM-dd');
      if (skippedDates.has(occurrenceDate)) {
        continue;
      }

      const occurrenceStart = parseISO(occurrenceDate);
      const occurrenceEnd = durationDays > 0
        ? format(addDays(occurrenceStart, durationDays), 'yyyy-MM-dd')
        : occurrenceDate;

      expanded.push({
        ...parent,
        id: `${parent.id}::${occurrenceDate}`,
        event_date: occurrenceDate,
        end_date: occurrenceEnd,
        recurrence_parent_id: parent.id,
        recurrence_instance_date: occurrenceDate,
        is_recurring_instance: true,
      });
    }
  }

  return sortEvents([...regularEvents, ...visibleExceptions, ...expanded]);
}
