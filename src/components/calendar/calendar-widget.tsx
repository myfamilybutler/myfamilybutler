import { useState, useCallback, useRef, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addDays,
} from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMemberColor } from '@/lib/utils/ui-helpers';
import { DayDetailDialog } from './day-detail-dialog';
import { useSelectedMembers } from '@/stores/filter-store';
import type { CalendarEvent } from '@/types/calendar';

// Re-export for backwards compatibility
export type { CalendarEvent } from '@/types/calendar';

const MAX_VISIBLE_EVENTS = 2;

export interface CalendarWidgetProps {
  events: CalendarEvent[];
  onEventsChanged?: () => void;
  hideHeader?: boolean;
  /** Controlled mode: current month from parent */
  month?: Date;
  /** Callback when month changes */
  onMonthChange?: (month: Date) => void;
  /** Hide the M T W T F S S header row */
  hideWeekdays?: boolean;
  className?: string;
}

export function CalendarWidget({ 
  events, 
  onEventsChanged, 
  hideHeader = false,
  hideWeekdays = false,
  month,
  onMonthChange,
  className,
}: CalendarWidgetProps) {
  // Use controlled or uncontrolled mode
  const [internalMonth, setInternalMonth] = useState(new Date());
  const currentMonth = month ?? internalMonth;
  const setCurrentMonth = useCallback((newMonth: Date | ((prev: Date) => Date)) => {
    setInternalMonth((prev) => {
      const resolved = typeof newMonth === 'function' ? newMonth(prev) : newMonth;
      onMonthChange?.(resolved);
      return resolved;
    });
  }, [onMonthChange]);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const isDragging = useRef(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const selectedMembers = useSelectedMembers();

  // Filter events based on selected members
  const filteredEvents = useMemo(() => {
    if (selectedMembers.length === 0) return events;
    return events.filter(event => 
      !event.family_member || selectedMembers.includes(event.family_member)
    );
  }, [events, selectedMembers]);

  // Optimize event lookup by date using a Map
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const date = event.event_date;
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(event);
    }
    return map;
  }, [filteredEvents]);

  const getEventsForDay = useCallback((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dayStr) || [];
  }, [eventsByDate]);

  const handlePrevMonth = useCallback(() => {
    setDirection('left');
    setCurrentMonth(prev => subMonths(prev, 1));
  }, [setCurrentMonth]);

  const handleNextMonth = useCallback(() => {
    setDirection('right');
    setCurrentMonth(prev => addMonths(prev, 1));
  }, [setCurrentMonth]);

  const handleToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth((current) => {
      const currentMonthStr = format(current, 'yyyy-MM');
      const nowMonthStr = format(now, 'yyyy-MM');
      
      if (currentMonthStr !== nowMonthStr) {
        setDirection(currentMonthStr > nowMonthStr ? 'left' : 'right');
        return now;
      }
      return current;
    });
  }, [setCurrentMonth]);

  const handleDayClick = useCallback((day: Date) => {
    if (!isDragging.current) {
      setSelectedDate(day);
    }
  }, []);

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;
    
    // Use velocity or offset to determine navigation
    if (velocity > 200 || offset > threshold) {
      handlePrevMonth();
    } else if (velocity < -200 || offset < -threshold) {
      handleNextMonth();
    }
    
    // Reset dragging state after a brief delay to prevent click
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const isTodayVisible = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  // Animation variants for month transitions
  const variants = {
    enter: (dir: 'left' | 'right') => ({
      x: dir === 'right' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'left' | 'right') => ({
      x: dir === 'right' ? -300 : 300,
      opacity: 0,
    }),
  };

  const { t, i18n } = useTranslation();
  
  // Update weekDays based on locale
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(start, i);
      return formatDate(day, 'EEE');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  return (
    <>
      <Card className={cn("bg-white", className)}>
        {!hideHeader && (
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
            <h2 className="text-lg font-bold text-gray-900 capitalize">
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
        )}
        <CardContent className={cn(hideHeader && "p-0 overflow-hidden")}>
          {/* Week day headers */}
          {!hideWeekdays && (
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs font-medium text-gray-500 py-1 uppercase"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Swipeable calendar grid */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="touch-pan-y"
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={format(currentMonth, 'yyyy-MM')}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 30,
                  duration: 0.3 
                }}
              >
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {calendarDays.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
                    const overflowCount = dayEvents.length - MAX_VISIBLE_EVENTS;

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          'relative min-h-[52px] sm:min-h-[72px] p-0.5 sm:p-1 rounded-lg text-sm transition-colors flex flex-col items-start text-left',
                          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1',
                          !isCurrentMonth && 'opacity-30 bg-slate-50/50',
                          isTodayDate && 'bg-emerald-50/50 ring-1 ring-emerald-200'
                        )}
                      >
                        {/* Day number */}
                        <span
                          className={cn(
                            'text-[11px] sm:text-xs font-medium self-center mb-0.5',
                            isTodayDate ? 'text-emerald-700 font-bold' : 'text-gray-700',
                          )}
                        >
                          {format(day, 'd')}
                        </span>

                        {/* Event strips */}
                        <div className="w-full space-y-0.5 overflow-hidden">
                          {visibleEvents.map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                'h-[14px] sm:h-4 rounded px-1 flex items-center w-full',
                                getMemberColor(event.family_member)
                              )}
                            >
                              <span className="text-[8px] sm:text-[10px] font-medium text-white truncate leading-none w-full">
                                {event.title}
                              </span>
                            </div>
                          ))}
                          
                          {/* Overflow indicator */}
                          {overflowCount > 0 && (
                            <div className="text-[9px] sm:text-[10px] text-gray-400 font-medium px-1">
                              +{overflowCount} {t('calendar.more')}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>

      <DayDetailDialog
        date={selectedDate}
        events={selectedDayEvents}
        open={selectedDate !== null}
        onOpenChange={(open: boolean) => !open && setSelectedDate(null)}
        onEventsChanged={onEventsChanged}
      />
    </>
  );
}
