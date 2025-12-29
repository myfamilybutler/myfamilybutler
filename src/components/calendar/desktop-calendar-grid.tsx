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

import { useState, useCallback, useMemo } from 'react';
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
import { QuickAddSheet } from './quick-add-sheet';
import { EditEventDialog } from './edit-event-dialog';
import type { CalendarEvent } from '@/types/calendar';

const MAX_VISIBLE_EVENTS = 3;

interface DesktopCalendarGridProps {
  events: CalendarEvent[];
  onEventsChanged?: () => void;
  /** Map of family member names to their colors (from settings) */
  memberColors?: Map<string, string>;
}

export function DesktopCalendarGrid({
  events,
  onEventsChanged,
  memberColors,
}: DesktopCalendarGridProps) {
  const { t, i18n } = useTranslation();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Calculate calendar weeks
  const weeks = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  
  // Group events by date for efficient lookup
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  
  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dayStr) || [];
  }, [eventsByDate]);
  
  // Get color for a family member
  const getMemberColor = useCallback((memberName?: string) => {
    if (!memberName) return getMemberColorClass(DEFAULT_MEMBER_COLOR);
    
    // Check if we have a custom color from settings
    if (memberColors?.has(memberName)) {
      return getMemberColorClass(memberColors.get(memberName));
    }
    
    // Fall back to default color assignment
    return getMemberColorClass(DEFAULT_MEMBER_COLOR);
  }, [memberColors]);
  
  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);
  
  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);
  
  const handleToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);
  
  // Cell click handlers
  const handleCellClick = useCallback((day: Date) => {
    setQuickAddDate(day);
    setQuickAddOpen(true);
  }, []);
  
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent cell click
    setEditingEvent(event);
    setEditDialogOpen(true);
  }, []);
  
  // Week day headers (Mon-Sun)
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

  return (
    <>
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
          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            {/* Header Row: Week number + Day names */}
            <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
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
            
            {/* Calendar Weeks */}
            {weeks.map((week, weekIndex) => {
              const weekNumber = getWeekNumber(week[0]);
              
              return (
                <div 
                  key={weekIndex}
                  className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0"
                >
                  {/* Week number */}
                  <div className="p-2 text-xs font-medium text-slate-400 text-center bg-slate-50/50 border-r border-slate-100 flex items-start justify-center pt-3">
                    {weekNumber}
                  </div>
                  
                  {/* Day cells */}
                  {week.map((day, dayIndex) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                    const overflowCount = dayEvents.length - MAX_VISIBLE_EVENTS;
                    
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "min-h-[100px] border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors",
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
                                    "w-full text-left rounded px-1.5 py-0.5 text-xs font-medium text-white truncate",
                                    "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    getMemberColor(event.family_member)
                                  )}
                                  onClick={(e) => handleEventClick(event, e)}
                                >
                                  {!event.is_all_day && event.event_time && (
                                    <span className="font-bold mr-1">
                                      {formatTime(event.event_time)}
                                    </span>
                                  )}
                                  {event.title}
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent 
                                className="w-72" 
                                side="right"
                                sideOffset={10}
                              >
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm">{event.title}</h4>
                                  
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                      {event.is_all_day 
                                        ? t('calendar.allDay')
                                        : event.event_time 
                                          ? formatTime(event.event_time)
                                          : t('calendar.noTime')
                                      }
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
                            <button 
                              className="text-xs text-slate-500 hover:text-slate-700 px-1.5 py-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(day);
                              }}
                            >
                              +{overflowCount} {t('calendar.more')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Add Sheet */}
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
