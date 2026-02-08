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
  startOfMonth,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn, formatTime, formatDate } from '@/lib/utils';
import { getMemberColorClass, DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';
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

export function DesktopCalendarGrid({
  events,
  onEventsChanged,
  hideHeader = false,
  month,
  onMonthChange,
}: DesktopCalendarGridProps) {
  const { memberColors } = useFamilyData();
  const { t, i18n } = useTranslation();
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
  const weeks = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  
  // Group events by date for efficient lookup
  const eventsByDate = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);
  
  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dayStr) || [];
  }, [eventsByDate]);
  
  // Get color for a family member from the colors map
  const getMemberColor = useCallback((memberName?: string) => {
    if (memberName && memberColors?.has(memberName)) {
      return getMemberColorClass(memberColors.get(memberName));
    }
    return getMemberColorClass(DEFAULT_MEMBER_COLOR);
  }, [memberColors]);

  const isUrgent = useCallback((event: CalendarEvent) => {
    if (event.is_all_day || !event.event_time) return false;

    const now = new Date();
    const eventDate = new Date(`${event.event_date}T${event.event_time}`);
    if (Number.isNaN(eventDate.getTime())) return false;

    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 2;
  }, []);
  
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
  const weekLayouts = useMemo(() => {
    return weeks.map((week) => {
      const weekDates = week.map((day) => format(day, 'yyyy-MM-dd'));
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];

      const intersectingEvents = filteredEvents
        .map((event) => {
          const eventEndDate = getEventEndDate(event);
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

          if (a.event.is_all_day && !b.event.is_all_day) return -1;
          if (!a.event.is_all_day && b.event.is_all_day) return 1;

          const timeA = a.event.event_time || '00:00';
          const timeB = b.event.event_time || '00:00';
          const byTime = timeA.localeCompare(timeB);
          if (byTime !== 0) return byTime;

          return a.event.title.localeCompare(b.event.title);
        });

      const lanes: Array<Array<{ startIndex: number; endIndex: number }>> = [];
      const segments: WeekEventSegment[] = [];

      for (const item of intersectingEvents) {
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

      const visibleByDay = activeByDay.map((daySegments) =>
        daySegments.filter((segment) => segment.lane < MAX_VISIBLE_EVENTS)
      );

      const overflowByDay = activeByDay.map((daySegments, dayIndex) =>
        Math.max(0, daySegments.length - visibleByDay[dayIndex].length)
      );

      return {
        visibleByDay,
        overflowByDay,
      };
    });
  }, [filteredEvents, getEventEndDate, weeks]);

  const getEventPillLayoutClasses = useCallback(
    (segment: WeekEventSegment, dayIndex: number) => {
      const connectLeft = dayIndex > segment.startIndex;
      const connectRight = dayIndex < segment.endIndex;

      if (connectLeft && connectRight) return '-mx-px rounded-none';
      if (!connectLeft && connectRight) return 'ml-1.5 sm:ml-2 -mr-px rounded-l-md rounded-r-none';
      if (connectLeft && !connectRight) return '-ml-px mr-1.5 sm:mr-2 rounded-r-md rounded-l-none';
      return 'mx-1.5 sm:mx-2 rounded-md';
    },
    []
  );
  
  // Locale-aware week day names
  const weekDays = useMemo(() => {
    const lang = i18n.language;
    const start = startOfMonth(new Date());
    const mondayStart = addDays(start, 1 - start.getDay());

    const days = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(mondayStart, i);
      return formatDate(day, 'EEE');
    });
    if (!lang) return days;
    return days;
  }, [i18n.language]);
  
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
        {weeks.map((week: Date[], weekIndex: number) => (
          <div 
            key={weekIndex} 
            className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))] border-b border-border"
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
              const weekLayout = weekLayouts[weekIndex];
              const visibleSegments = weekLayout?.visibleByDay[dayIndex] || [];
              const overflowCount = weekLayout?.overflowByDay[dayIndex] || 0;
              
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "min-h-[60px] sm:min-h-[100px] border-r border-border last:border-r-0 cursor-pointer transition-colors",
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
                  
                  {/* Events */}
                  <div className="pb-1.5 space-y-1">
                    {visibleSegments.map((segment) => (
                      <HoverCard key={`${segment.event.id}:${dayStr}`} openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button
                            className={cn(
                              "w-full text-left px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-medium text-white",
                              "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50",
                              getEventPillLayoutClasses(segment, dayIndex),
                              getMemberColor(segment.event.family_member)
                            )}
                            onClick={(e) => handleEventClick(segment.event, e)}
                          >
                            <span className="flex items-center gap-1 truncate">
                              {/* Urgent indicator for events within 2 hours */}
                              {isUrgent(segment.event) && (
                                <AlertCircle className="w-3 h-3 flex-shrink-0 animate-pulse" />
                              )}
                              {!segment.event.is_all_day &&
                                segment.event.event_time &&
                                dayStr === segment.event.event_date && (
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
                            
                            {/* Time */}
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
                            
                            {/* Location */}
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
                    ))}
                    
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
          </div>
        ))}
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
