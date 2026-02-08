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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn, formatTime, formatDate, getWeekStartsOn } from '@/lib/utils';
import { getMemberColorPresentation, getMemberColor } from '@/lib/utils/ui-helpers';
import { getCalendarDays, getWeekNumber, groupEventsByDate } from '@/lib/utils/calendar-helpers';
import { useSelectedMembers } from '@/stores/filter-store';
import { useFamilyData } from '@/stores/family-store';
import { QuickAddSheet } from './quick-add-sheet';
import { EditEventDialog } from './edit-event-dialog';
import { DayDetailDialog } from './day-detail-dialog';
import { EventDetailDialog } from './event-detail-dialog';
import type { CalendarEvent } from '@/types/calendar';

const MAX_VISIBLE_EVENTS = 3;

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
  barDepthByDay: number[];
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
        daySegments.filter((segment) => segment.lane < MAX_VISIBLE_EVENTS)
      );

      const visibleBars = segments.filter((segment) => segment.lane < MAX_VISIBLE_EVENTS);

      const barDepthByDay = visibleBarsByDay.map((daySegments) => {
        if (daySegments.length === 0) return 0;
        return Math.max(...daySegments.map((segment) => segment.lane)) + 1;
      });

      const visibleTimedByDay = timedEventsByDay.map((dayTimedEvents, dayIndex) => {
        const remainingSlots = Math.max(0, MAX_VISIBLE_EVENTS - barDepthByDay[dayIndex]);
        return dayTimedEvents.slice(0, remainingSlots);
      });

      const overflowByDay = activeByDay.map((daySegments, dayIndex) => {
        const hiddenBars = Math.max(0, daySegments.length - visibleBarsByDay[dayIndex].length);
        const hiddenTimed = Math.max(0, timedEventsByDay[dayIndex].length - visibleTimedByDay[dayIndex].length);
        return hiddenBars + hiddenTimed;
      });

      return {
        visibleBars,
        visibleTimedByDay,
        overflowByDay,
        barDepthByDay,
      };
    });
  }, [filteredEvents, getEventEndDate, weeks]);

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
      <div className="overflow-hidden border-t border-border">
        {/* Header Row: Week number + Day names */}
        <div className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))] border-b border-border bg-muted/50">
          {/* Week number header */}
          <div className="p-2 text-xs font-medium text-muted-foreground text-center border-r border-border">
            {t('calendar.week')}
          </div>
          {/* Day names */}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="p-2 text-xs font-medium text-foreground/70 text-center uppercase tracking-wider border-r border-border last:border-r-0"
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

          return (
            <div
              key={weekIndex}
              className="relative grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))] border-b border-border"
            >
              {/* Week number */}
              <div className="p-2 text-xs font-medium text-muted-foreground text-center border-r border-border bg-muted/20">
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
                const barDepth = weekLayout?.barDepthByDay[dayIndex] || 0;

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative overflow-visible min-h-[60px] sm:min-h-[100px] cursor-pointer transition-colors",
                      "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500",
                      !isCurrentMonth && "bg-muted/10 text-muted-foreground/50"
                    )}
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
                        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-border z-0"
                      />
                    )}

                    {/* Day number */}
                    <div className="p-1.5 flex justify-end">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full",
                          isTodayDate
                            ? "bg-emerald-500 text-white"
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
                      className="relative z-10 pb-1.5 space-y-1"
                      style={barDepth > 0 ? { paddingTop: `${barDepth * 28}px` } : undefined}
                    >
                      {visibleTimedEvents.map((event) => {
                        const color = getMemberAppearance(event.family_member);

                        return (
                          <HoverCard key={`${event.id}:${dayStr}:timed`} openDelay={200}>
                            <HoverCardTrigger asChild>
                              <button
                                className={cn(
                                  "relative z-20 w-full text-left px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs",
                                  "rounded-sm hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                                )}
                                onClick={(e) => handleEventClick(event, e)}
                              >
                                <span className="flex items-center gap-1 min-w-0">
                                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", color.dotBg)} />
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
                                  <div className="flex items-center gap-2 pt-1 border-t">
                                    <span
                                      className={cn(
                                        "w-3 h-3 rounded-full",
                                        color.dotBg
                                      )}
                                    />
                                    <span className="text-xs font-medium">
                                      {event.family_member}
                                    </span>
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
                          className="text-xs text-muted-foreground font-medium px-1.5 sm:px-2 hover:text-foreground transition-colors"
                        >
                          +{overflowCount} {t('calendar.more')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Week bar overlay (single element per multi-day/all-day event) */}
              <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))] grid-rows-[30px_repeat(3,24px)] sm:grid-rows-[34px_repeat(3,24px)] gap-y-1">
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
                            "pointer-events-auto relative z-20 flex h-6 w-full items-center text-left px-1.5 sm:px-2 text-[11px] sm:text-xs font-medium text-white",
                            "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50",
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
                            <div className="flex items-center gap-2 pt-1 border-t">
                              <span
                                className={cn(
                                  "w-3 h-3 rounded-full",
                                  getMemberColor(segment.event.family_member)
                                )}
                              />
                              <span className="text-xs font-medium">
                                {segment.event.family_member}
                              </span>
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
        <Card className="bg-card border-border overflow-hidden gap-0 py-0">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              {/* Month navigation */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePrevMonth}
                  className="h-8 w-8 hover:bg-accent"
                  aria-label={t('common.prevMonth')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextMonth}
                  className="h-8 w-8 hover:bg-accent"
                  aria-label={t('common.nextMonth')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Month/Year title */}
              <h2 className="text-xl font-bold text-foreground capitalize">
                {formatDate(currentMonth, 'MMMM yyyy')}
              </h2>
              
              {/* Today button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className={cn(
                  "h-8 text-xs font-medium",
                  isTodayVisible && "opacity-50"
                )}
              >
                {t('calendar.today')}
              </Button>
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
