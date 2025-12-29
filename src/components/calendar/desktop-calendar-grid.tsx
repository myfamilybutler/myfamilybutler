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
import { cn, formatTime, formatDate } from '@/lib/utils';
import { getMemberColorClass, DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';
import { getCalendarDays, getWeekNumber, groupEventsByDate } from '@/lib/utils/calendar-helpers';
import { useSelectedMembers } from '@/stores/filter-store';
import { QuickAddSheet } from './quick-add-sheet';
import { EditEventDialog } from './edit-event-dialog';
import type { CalendarEvent } from '@/types/calendar';

const MAX_VISIBLE_EVENTS = 3;

interface DesktopCalendarGridProps {
  events: CalendarEvent[];
  onEventsChanged?: () => void;
  /** Map of family member names to their HEX colors */
  memberColors?: Map<string, string>;
  /** Hide the header navigation (for embedded mode) */
  hideHeader?: boolean;
  /** Controlled month from parent */
  month?: Date;
  /** Callback when month changes */
  onMonthChange?: (month: Date) => void;
}

export function DesktopCalendarGrid({
  events,
  onEventsChanged,
  memberColors,
  hideHeader = false,
  month,
  onMonthChange,
}: DesktopCalendarGridProps) {
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
    setEditingEvent(event);
    setEditDialogOpen(true);
  }, []);
  
  // Locale-aware week day names
  const weekDays = useMemo(() => {
    const start = addDays(startOfMonth(currentMonth), 0);
    const mondayStart = new Date(start);
    mondayStart.setDate(start.getDate() - start.getDay() + 1);
    
    return Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(mondayStart, i);
      return formatDate(day, 'EEE');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="overflow-hidden">
        {/* Header Row: Week number + Day names */}
        <div className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))] border-b border-slate-200 bg-slate-50">
          {/* Week number header */}
          <div className="p-2 text-xs font-medium text-slate-400 text-center border-r border-slate-200">
            {t('calendar.week')}
          </div>
          {/* Day names */}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="p-2 text-xs font-medium text-slate-600 text-center uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar weeks */}
        {weeks.map((week: Date[], weekIndex: number) => (
          <div 
            key={weekIndex} 
            className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(100px,1fr))] border-b border-slate-100 last:border-b-0"
          >
            {/* Week number */}
            <div className="p-2 text-xs font-medium text-slate-400 text-center border-r border-slate-100 bg-slate-50/50">
              {getWeekNumber(week[0])}
            </div>
            
            {/* Day cells */}
            {week.map((day: Date, dayIndex: number) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const overflowCount = dayEvents.length - MAX_VISIBLE_EVENTS;
              
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "min-h-[60px] sm:min-h-[100px] border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors",
                    "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500",
                    !isCurrentMonth && "bg-slate-50/30"
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
                            ? "text-gray-900" 
                            : "text-gray-400"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {/* Events */}
                  <div className="px-1 pb-1 space-y-0.5">
                    {visibleEvents.map((event) => (
                      <HoverCard key={event.id} openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button
                            className={cn(
                              "w-full text-left rounded px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-white",
                              "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50",
                              getMemberColor(event.family_member)
                            )}
                            onClick={(e) => handleEventClick(event, e)}
                          >
                            <span className="block truncate">
                              {!event.is_all_day && event.event_time && (
                                <span className="font-bold mr-1">
                                  {formatTime(event.event_time)}
                                </span>
                              )}
                              {event.title}
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
                            
                            {/* Time */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {event.is_all_day ? (
                                <span>{t('calendar.allDay')}</span>
                              ) : (
                                <span>
                                  {formatTime(event.event_time)}
                                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                                </span>
                              )}
                            </div>
                            
                            {/* Location */}
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
                                    getMemberColor(event.family_member)
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
                    ))}
                    
                    {/* Overflow indicator */}
                    {overflowCount > 0 && (
                      <div className="text-xs text-slate-400 font-medium px-1.5">
                        +{overflowCount} {t('calendar.more')}
                      </div>
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
        <div className="bg-white">{calendarContent}</div>
      ) : (
        // Standalone mode: full Card with header
        <Card className="bg-white">
          <CardHeader className="border-b-0">
            <div className="flex items-center justify-between">
              {/* Month navigation */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePrevMonth}
                  className="h-8 w-8 hover:bg-slate-100"
                  aria-label={t('common.prevMonth')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextMonth}
                  className="h-8 w-8 hover:bg-slate-100"
                  aria-label={t('common.nextMonth')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Month/Year title */}
              <h2 className="text-xl font-bold text-gray-900 capitalize">
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
