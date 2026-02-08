'use client';

/**
 * Desktop Calendar Grid Component
 * 
 * Full-width Google Calendar-style calendar grid for desktop view.
 * Features:
 * - 8-column CSS Grid (week number + Mon-Sun)
 * - ISO week numbers
 * - Event pills with family member colors
 * - Click empty cell → Open Quick Add
 * - Click event → Open Edit Event
 * - Hover tooltip with event details
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  format,
  startOfWeek,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FamilyMemberBadge } from '@/components/ui/family-member-badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn, formatTime, formatDate, getWeekStartsOn } from '@/lib/utils';
import { getMemberColorPresentation } from '@/lib/utils/ui-helpers';
import { getCalendarDays, getWeekNumber, groupEventsByDate } from '@/lib/utils/calendar-helpers';
import { useSelectedMembers } from '@/stores/filter-store';
import { useFamilyData } from '@/stores/family-store';
import { QuickAddSheet } from './quick-add-sheet';
import { EditEventDialog } from './edit-event-dialog';
import { DayDetailDialog } from './day-detail-dialog';
import { EventDetailDialog } from './event-detail-dialog';
import type { CalendarEvent } from '@/types/calendar';

const MAX_VISIBLE_BARS = 3;
const MAX_VISIBLE_TIMED_EVENTS = 2;
const DAY_NUMBER_ROW_HEIGHT = 34;
const BAR_ROW_HEIGHT = 24;
const BAR_ROW_GAP = 4;
const BAR_STACK_OFFSET = BAR_ROW_HEIGHT + BAR_ROW_GAP;
const TIMED_ROW_HEIGHT = 24;
const OVERFLOW_ROW_HEIGHT = 18;
const DAY_CELL_BOTTOM_PADDING = 10;
const DESKTOP_MIN_DAY_CELL_HEIGHT = 120;
const DESKTOP_GRID_COLUMNS = 'grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))]';

interface DesktopCalendarGridProps {
  events: CalendarEvent[];
  onEventsChanged?: () => void;
  /** Hide the header navigation (for embedded mode) */
  hideHeader?: boolean;
  /** Controlled month from parent */
  month?: Date;
  /** Callback when month changes */
  onMonthChange?: (month: Date) => void;
}

interface WeekEventSegment {
  event: CalendarEvent;
  lane: number;
  startIndex: number;
  endIndex: number;
}

interface WeekLayout {
  visibleBars: WeekEventSegment[];
  visibleTimedByDay: CalendarEvent[][];
  overflowByDay: number[];
  maxBarDepth: number;
  weekMinHeight: number;
}

export function DesktopCalendarGrid({
  events,
  onEventsChanged,
  hideHeader = false,
  month,
  onMonthChange,
}: DesktopCalendarGridProps) {
  const { memberColors } = useFamilyData();
  const { t, i18n } = useTranslation();
  const weekStartsOn = useMemo(() => getWeekStartsOn(i18n.language), [i18n.language]);
  const selectedMembers = useSelectedMembers();
  const isDragging = useRef(false);
  
  // Support controlled or uncontrolled month
  const [internalMonth, setInternalMonth] = useState(new Date());
  const currentMonth = month ?? internalMonth;
  
  const setCurrentMonth = useCallback((newMonth: Date | ((prev: Date) => Date)) => {
    setInternalMonth((prev) => {
      const resolved = typeof newMonth === 'function' ? newMonth(prev) : newMonth;
      onMonthChange?.(resolved);
      return resolved;
    });
  }, [onMonthChange]);
  
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | undefined>();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Filter events based on selected members
  const filteredEvents = useMemo(() => {
    if (selectedMembers.length === 0) return events;
    return events.filter(event => 
      !event.family_member || selectedMembers.includes(event.family_member)
    );
  }, [events, selectedMembers]);
  
  // Calculate calendar weeks
  const weeks = useMemo(
    () => getCalendarDays(currentMonth, weekStartsOn),
    [currentMonth, weekStartsOn]
  );
  
  // Group events by date for efficient lookup
  const eventsByDate = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);
  
  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dayStr) || [];
  }, [eventsByDate]);
  
  // Resolve member color tokens for bar-style and text-style rendering.
  const getMemberAppearance = useCallback((memberName?: string) => {
    const explicitHex = memberName ? memberColors?.get(memberName) : undefined;
    return getMemberColorPresentation(memberName, explicitHex);
  }, [memberColors]);
  
  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, [setCurrentMonth]);
  
  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, [setCurrentMonth]);
  
  const handleToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, [setCurrentMonth]);
  
  // Swipe handling for month navigation
  const handleDragStart = () => {
    isDragging.current = true;
  };
  
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    if (velocity > 200 || offset > threshold) {
      handlePrevMonth();
    } else if (velocity < -200 || offset < -threshold) {
      handleNextMonth();
    }
    
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  }, [handlePrevMonth, handleNextMonth]);
  
  // Cell click handlers
  const handleCellClick = useCallback((day: Date) => {
    if (isDragging.current) return;
    setQuickAddDate(day);
    setQuickAddOpen(true);
  }, []);
  
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging.current) return;
    setSelectedEvent(event);
    setEventDetailOpen(true);
  }, []);

  const handleMoreEventsClick = useCallback((day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging.current) return;
    setSelectedDay(day);
  }, []);

  const getEventEndDate = useCallback((event: CalendarEvent) => {
    if (!event.end_date || event.end_date < event.event_date) {
      return event.event_date;
    }
    return event.end_date;
  }, []);

  const minDayCellHeight = hideHeader ? 88 : DESKTOP_MIN_DAY_CELL_HEIGHT;

  // Google-like week lanes: a stable row model per week avoids jitter/overlap and keeps strip continuity correct.
  const weekLayouts = useMemo<WeekLayout[]>(() => {
    return weeks.map((week) => {
      const weekDates = week.map((day) => format(day, 'yyyy-MM-dd'));
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];
      const timedEventsByDay: CalendarEvent[][] = weekDates.map(() => []);

      const barCandidates = filteredEvents
        .map((event) => {
          const eventEndDate = getEventEndDate(event);

          // Google-like month behavior:
          // - all-day OR multi-day events are rendered as bars
          // - single-day timed events are rendered as text rows
          const isMultiDay = eventEndDate > event.event_date;
          const isBarType = event.is_all_day || isMultiDay;

          if (!isBarType) {
            const timedIndex = weekDates.indexOf(event.event_date);
            if (timedIndex !== -1) {
              timedEventsByDay[timedIndex].push(event);
            }
            return null;
          }

          if (eventEndDate < weekStart || event.event_date > weekEnd) {
            return null;
          }

          const segmentStart = event.event_date < weekStart ? weekStart : event.event_date;
          const segmentEnd = eventEndDate > weekEnd ? weekEnd : eventEndDate;
          const startIndex = weekDates.indexOf(segmentStart);
          const endIndex = weekDates.indexOf(segmentEnd);

          if (startIndex === -1 || endIndex === -1) {
            return null;
          }

          return {
            event,
            startIndex,
            endIndex,
          };
        })
        .filter(
          (
            value
          ): value is {
            event: CalendarEvent;
            startIndex: number;
            endIndex: number;
          } => Boolean(value)
        )
        .sort((a, b) => {
          if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;

          const spanA = a.endIndex - a.startIndex;
          const spanB = b.endIndex - b.startIndex;
          if (spanA !== spanB) return spanB - spanA;

          return a.event.title.localeCompare(b.event.title);
        });

      for (const dayTimedEvents of timedEventsByDay) {
        dayTimedEvents.sort((a, b) => {
          const timeA = a.event_time || '00:00';
          const timeB = b.event_time || '00:00';
          const byTime = timeA.localeCompare(timeB);
          if (byTime !== 0) return byTime;
          return a.title.localeCompare(b.title);
        });
      }

      const lanes: Array<Array<{ startIndex: number; endIndex: number }>> = [];
      const segments: WeekEventSegment[] = [];

      for (const item of barCandidates) {
        let lane = 0;
        while (true) {
          const laneOccupancy = lanes[lane] || [];
          const conflicts = laneOccupancy.some(
            (occupied) =>
              !(item.endIndex < occupied.startIndex || item.startIndex > occupied.endIndex)
          );

          if (!conflicts) {
            lanes[lane] = [...laneOccupancy, { startIndex: item.startIndex, endIndex: item.endIndex }];
            segments.push({
              event: item.event,
              lane,
              startIndex: item.startIndex,
              endIndex: item.endIndex,
            });
            break;
          }

          lane += 1;
        }
      }

      const activeByDay = weekDates.map((_, dayIndex) =>
        segments
          .filter((segment) => dayIndex >= segment.startIndex && dayIndex <= segment.endIndex)
          .sort((a, b) => a.lane - b.lane)
      );

      const visibleBarsByDay = activeByDay.map((daySegments) =>
        daySegments.filter((segment) => segment.lane < MAX_VISIBLE_BARS)
      );

      const visibleBars = segments.filter((segment) => segment.lane < MAX_VISIBLE_BARS);

      const barDepthByDay = visibleBarsByDay.map((daySegments) => {
        if (daySegments.length === 0) return 0;
        return Math.max(...daySegments.map((segment) => segment.lane)) + 1;
      });

      const visibleTimedByDay = timedEventsByDay.map((dayTimedEvents) =>
        dayTimedEvents.slice(0, MAX_VISIBLE_TIMED_EVENTS)
      );

      const overflowByDay = activeByDay.map((daySegments, dayIndex) => {
        const hiddenBars = Math.max(0, daySegments.length - visibleBarsByDay[dayIndex].length);
        const hiddenTimed = Math.max(0, timedEventsByDay[dayIndex].length - visibleTimedByDay[dayIndex].length);
        return hiddenBars + hiddenTimed;
      });

      const maxBarDepth = barDepthByDay.reduce((max, depth) => Math.max(max, depth), 0);
      const maxTimedDepth = visibleTimedByDay.reduce((max, dayEvents) => Math.max(max, dayEvents.length), 0);
      const showOverflowRow = overflowByDay.some((count) => count > 0);
      const weekMinHeight = Math.max(
        minDayCellHeight,
        DAY_NUMBER_ROW_HEIGHT +
          maxBarDepth * BAR_STACK_OFFSET +
          maxTimedDepth * TIMED_ROW_HEIGHT +
          (showOverflowRow ? OVERFLOW_ROW_HEIGHT : 0) +
          DAY_CELL_BOTTOM_PADDING
      );

      return {
        visibleBars,
        visibleTimedByDay,
        overflowByDay,
        maxBarDepth,
        weekMinHeight,
      };
    });
  }, [filteredEvents, getEventEndDate, minDayCellHeight, weeks]);

  const getWeekBarLayoutClasses = useCallback(
    (segment: WeekEventSegment, weekStart: string, weekEnd: string) => {
      const eventEndDate = getEventEndDate(segment.event);
      const continuesFromPreviousWeek = segment.startIndex === 0 && segment.event.event_date < weekStart;
      const continuesToNextWeek = segment.endIndex === 6 && eventEndDate > weekEnd;

      if (continuesFromPreviousWeek && continuesToNextWeek) return 'rounded-none';
      if (continuesFromPreviousWeek && !continuesToNextWeek) {
        return 'mr-1.5 sm:mr-2 rounded-r-md rounded-l-none';
      }
      if (!continuesFromPreviousWeek && continuesToNextWeek) {
        return 'ml-1.5 sm:ml-2 rounded-l-md rounded-r-none';
      }
      return 'mx-1.5 sm:mx-2 rounded-md';
    },
    [getEventEndDate]
  );
  
  // Locale-aware week day names
  const weekDays = useMemo(() => {
    const language = i18n.language;
    const start = startOfWeek(new Date(), { weekStartsOn });
    const days = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(start, i);
      return formatDate(day, 'EEE', language);
    });
    return days;
  }, [weekStartsOn, i18n.language]);

  const monthStats = useMemo(() => {
    if (weeks.length === 0) {
      return {
        total: 0,
        allDay: 0,
        timed: 0,
      };
    }

    const rangeStart = format(weeks[0][0], 'yyyy-MM-dd');
    const rangeEnd = format(weeks[weeks.length - 1][6], 'yyyy-MM-dd');

    let total = 0;
    let allDay = 0;

    for (const event of filteredEvents) {
      const eventEndDate = getEventEndDate(event);
      if (eventEndDate < rangeStart || event.event_date > rangeEnd) {
        continue;
      }

      total += 1;
      if (event.is_all_day) {
        allDay += 1;
      }
    }

    return {
      total,
      allDay,
      timed: Math.max(0, total - allDay),
    };
  }, [filteredEvents, getEventEndDate, weeks]);

  const visibleWeekRangeLabel = useMemo(() => {
    if (weeks.length === 0) return '';
    const firstWeek = getWeekNumber(weeks[0][0]);
    const lastWeek = getWeekNumber(weeks[weeks.length - 1][6]);
    if (firstWeek === lastWeek) {
      return `${t('calendar.week')} ${firstWeek}`;
    }
    return `${t('calendar.week')} ${firstWeek}-${lastWeek}`;
  }, [t, weeks]);
  
  const isTodayVisible = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  // Render calendar grid (shared content)
  const calendarContent = (
    <motion.div
      drag={hideHeader ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="touch-pan-y"
    >
      <div className="overflow-hidden border-t border-border/60 bg-gradient-to-b from-muted/15 via-transparent to-transparent">
        {/* Header Row: Week number + Day names */}
        <div className={cn("grid border-b border-border/60 bg-muted/45 backdrop-blur", DESKTOP_GRID_COLUMNS)}>
          {/* Week number header */}
          <div className="p-2 text-xs font-semibold tracking-wide text-muted-foreground text-center border-r border-border/60">
            {t('calendar.week')}
          </div>
          {/* Day names */}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="p-2 text-xs font-semibold text-foreground/70 text-center uppercase tracking-[0.14em] border-r border-border/60 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar weeks */}
        {weeks.map((week: Date[], weekIndex: number) => {
          const weekLayout = weekLayouts[weekIndex];
          const weekStart = format(week[0], 'yyyy-MM-dd');
          const weekEnd = format(week[6], 'yyyy-MM-dd');
          const visibleWeekBars = weekLayout?.visibleBars || [];
          const weekMaxBarDepth = weekLayout?.maxBarDepth || 0;
          const weekMinHeight = weekLayout?.weekMinHeight || minDayCellHeight;

          return (
            <div
              key={weekIndex}
              className={cn("relative grid border-b border-border/60", DESKTOP_GRID_COLUMNS)}
            >
              {/* Week number */}
              <div
                className="p-2 text-xs font-semibold text-muted-foreground text-center border-r border-border/60 bg-muted/20"
                style={{ minHeight: `${weekMinHeight}px` }}
              >
                {getWeekNumber(week[0])}
              </div>

              {/* Day cells */}
              {week.map((day: Date, dayIndex: number) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                const visibleTimedEvents = weekLayout?.visibleTimedByDay[dayIndex] || [];
                const overflowCount = weekLayout?.overflowByDay[dayIndex] || 0;

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative overflow-visible cursor-pointer transition-colors bg-background/70",
                      "hover:bg-emerald-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
                      isTodayDate && "bg-emerald-500/[0.08]",
                      !isCurrentMonth && "bg-muted/15 text-muted-foreground/50"
                    )}
                    style={{ minHeight: `${weekMinHeight}px` }}
                    onClick={() => handleCellClick(day)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${formatDate(day, 'EEEE, MMMM d')}. ${dayEvents.length} ${t('calendar.events')}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCellClick(day);
                      }
                    }}
                  >
                    {dayIndex < week.length - 1 && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border/60 z-0"
                      />
                    )}

                    {/* Day number */}
                    <div
                      className="px-2 pt-1.5 flex justify-end"
                      style={{ minHeight: `${DAY_NUMBER_ROW_HEIGHT}px` }}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-7 h-7 text-sm font-semibold rounded-full",
                          isTodayDate
                            ? "bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Timed events and overflow */}
                    <div
                      className="relative z-30 px-1 pb-2 space-y-1"
                      style={{
                        paddingTop: `${weekMaxBarDepth * BAR_STACK_OFFSET + 2}px`,
                      }}
                    >
                      {visibleTimedEvents.map((event) => {
                        const color = getMemberAppearance(event.family_member);

                        return (
                          <HoverCard key={`${event.id}:${dayStr}:timed`} openDelay={200}>
                            <HoverCardTrigger asChild>
                              <button
                                className={cn(
                                  "relative z-40 w-full text-left px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs",
                                  "rounded-md border border-transparent hover:bg-muted/70 hover:border-border/70",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                                )}
                                onClick={(e) => handleEventClick(event, e)}
                              >
                                <span className="flex items-center gap-1 min-w-0">
                                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm", color.dotBg)} />
                                  {event.event_time && (
                                    <span className={cn("font-semibold tabular-nums whitespace-nowrap", color.text)}>
                                      {formatTime(event.event_time)}
                                    </span>
                                  )}
                                  <span className={cn("truncate", color.text)}>{event.title}</span>
                                </span>
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent
                              side="right"
                              align="start"
                              className="w-64 p-3 hidden sm:block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">{event.title}</h4>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>
                                    {formatTime(event.event_time)}
                                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                                  </span>
                                </div>

                                {event.location && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}

                                {event.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {event.description}
                                  </p>
                                )}

                                {event.family_member && (
                                  <div className="border-t pt-1">
                                    <FamilyMemberBadge
                                      name={event.family_member}
                                      colorHex={memberColors?.get(event.family_member)}
                                      size="xs"
                                    />
                                  </div>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}

                      {/* Overflow indicator */}
                      {overflowCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleMoreEventsClick(day, e)}
                          className="text-[11px] sm:text-xs text-muted-foreground font-semibold px-1.5 sm:px-2 py-0.5 rounded-md hover:bg-muted/50 hover:text-foreground transition-colors"
                        >
                          +{overflowCount} {t('calendar.more')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Week bar overlay (single element per multi-day/all-day event) */}
              <div
                className={cn("pointer-events-none absolute inset-0 z-20 grid", DESKTOP_GRID_COLUMNS)}
                style={{
                  gridTemplateRows: `${DAY_NUMBER_ROW_HEIGHT}px repeat(${MAX_VISIBLE_BARS}, ${BAR_ROW_HEIGHT}px)`,
                  rowGap: `${BAR_ROW_GAP}px`,
                }}
              >
                {visibleWeekBars.map((segment) => {
                  const segmentStart = week[segment.startIndex];
                  const segmentStartDate = format(segmentStart, 'yyyy-MM-dd');
                  const color = getMemberAppearance(segment.event.family_member);

                  return (
                    <HoverCard
                      key={`${segment.event.id}:${weekStart}:${segment.startIndex}:${segment.endIndex}:${segment.lane}`}
                      openDelay={200}
                    >
                      <HoverCardTrigger asChild>
                        <button
                          aria-label={segment.event.title}
                          className={cn(
                            "pointer-events-auto relative z-20 flex h-6 w-full items-center text-left px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold text-white",
                            "shadow-[0_8px_14px_-8px_rgba(15,23,42,0.7)] ring-1 ring-black/10 dark:ring-white/15",
                            "hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                            getWeekBarLayoutClasses(segment, weekStart, weekEnd),
                            color.barBg
                          )}
                          style={{
                            gridColumn: `${segment.startIndex + 2} / ${segment.endIndex + 3}`,
                            gridRow: `${segment.lane + 2}`,
                          }}
                          onClick={(e) => handleEventClick(segment.event, e)}
                        >
                          <span className="flex items-center gap-1 truncate">
                            {!segment.event.is_all_day &&
                              segment.event.event_time &&
                              segmentStartDate === segment.event.event_date && (
                              <span className="font-bold mr-1">
                                {formatTime(segment.event.event_time)}
                              </span>
                            )}
                            {segment.event.title}
                          </span>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent
                        side="right"
                        align="start"
                        className="w-64 p-3 hidden sm:block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">{segment.event.title}</h4>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {segment.event.is_all_day ? (
                              <span>{t('calendar.allDay')}</span>
                            ) : (
                              <span>
                                {formatTime(segment.event.event_time)}
                                {segment.event.end_time && ` - ${formatTime(segment.event.end_time)}`}
                              </span>
                            )}
                          </div>

                          {segment.event.location && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{segment.event.location}</span>
                            </div>
                          )}

                          {segment.event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {segment.event.description}
                            </p>
                          )}

                          {segment.event.family_member && (
                            <div className="border-t pt-1">
                              <FamilyMemberBadge
                                name={segment.event.family_member}
                                colorHex={memberColors?.get(segment.event.family_member)}
                                size="xs"
                              />
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <>
      {hideHeader ? (
        // Embedded mode: just the grid, no Card wrapper
        <div className="bg-card">{calendarContent}</div>
      ) : (
        // Standalone mode: full Card with header
        <Card className="relative bg-card/95 border-border/60 overflow-hidden gap-0 py-0 shadow-[0_24px_64px_-40px_rgba(16,185,129,0.5)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-500/18 via-cyan-500/8 to-blue-500/14" />
          <CardHeader className="relative py-4 sm:py-5 border-b border-border/60 bg-background/40 backdrop-blur">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                {/* Month navigation */}
                <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/75 p-1 shadow-sm">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handlePrevMonth}
                    className="h-8 w-8 rounded-full hover:bg-accent/70"
                    aria-label={t('common.prevMonth')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleNextMonth}
                    className="h-8 w-8 rounded-full hover:bg-accent/70"
                    aria-label={t('common.nextMonth')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Month/Year title */}
                <div className="flex-1 text-center">
                  <h2 className="text-xl font-bold tracking-tight text-foreground capitalize">
                    {formatDate(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {visibleWeekRangeLabel}
                  </p>
                </div>
                
                {/* Today button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className={cn(
                    "h-8 text-xs font-semibold border-border/70 bg-background/70 backdrop-blur",
                    isTodayVisible && "opacity-55"
                  )}
                >
                  {t('calendar.today')}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                <Badge variant="secondary" size="sm">
                  {monthStats.total} {t('calendar.events')}
                </Badge>
                <Badge variant="success" size="sm">
                  {monthStats.allDay} {t('calendar.allDay')}
                </Badge>
                <Badge variant="info" size="sm">
                  {monthStats.timed} {t('calendar.time')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {calendarContent}
          </CardContent>
        </Card>
      )}

      {/* Quick Add Dialog */}
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onEventCreated={onEventsChanged}
        defaultDate={quickAddDate}
      />

      {/* Edit Event Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
        onEdit={(event) => {
          setEventDetailOpen(false);
          setEditingEvent(event);
          setEditDialogOpen(true);
        }}
      />

      <DayDetailDialog
        date={selectedDay}
        events={selectedDay ? getEventsForDay(selectedDay) : []}
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDay(null);
          }
        }}
        onEventsChanged={onEventsChanged}
      />

      <EditEventDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEventUpdated={onEventsChanged}
        onEventDeleted={onEventsChanged}
      />
    </>
  );
}
