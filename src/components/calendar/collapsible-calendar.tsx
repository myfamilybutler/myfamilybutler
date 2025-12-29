'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarWidget } from './calendar-widget';
import type { CalendarEvent } from '@/types/calendar';
import { formatDate } from '@/lib/utils';

interface CollapsibleCalendarProps {
  events: CalendarEvent[];
  onEventsChanged?: () => void;
  defaultExpanded?: boolean;
  /** Map of family member names to their HEX colors */
  memberColors?: Map<string, string>;
}

export function CollapsibleCalendar({
  events,
  onEventsChanged,
  defaultExpanded = false,
  memberColors,
}: CollapsibleCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');

  // Get current week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  // Count events per day for dots
  const eventCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of events) {
      const date = event.event_date;
      counts[date] = (counts[date] || 0) + 1;
    }
    return counts;
  }, [events]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Week navigation (for collapsed view)
  const handlePrevWeek = useCallback(() => {
    setSwipeDirection('left');
    setSelectedDate(prev => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setSwipeDirection('right');
    setSelectedDate(prev => addWeeks(prev, 1));
  }, []);

  // Month navigation (for expanded view)
  const handlePrevMonth = useCallback(() => {
    setSwipeDirection('left');
    setSelectedDate(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setSwipeDirection('right');
    setSelectedDate(prev => addMonths(prev, 1));
  }, []);

  // Handle swipe gesture
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      handlePrevWeek();
    } else if (info.offset.x < -threshold) {
      handleNextWeek();
    }
  }, [handlePrevWeek, handleNextWeek]);

  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
      {/* Header - consistent layout with navigation */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center justify-between w-full gap-2">
          {/* Navigation arrows */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={isExpanded ? handlePrevMonth : handlePrevWeek}
              className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={isExpanded ? handleNextMonth : handleNextWeek}
              className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Title */}
          <h2 className="text-base font-semibold text-gray-900 capitalize flex-1 text-center">
            {formatDate(selectedDate, 'MMMM yyyy')}
          </h2>
          
          {/* Expand/Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100"
            aria-label={isExpanded ? 'Collapse calendar' : 'Expand calendar'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Persistent Week Day Headers - matches CalendarWidget exact styling */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="text-center text-[10px] sm:text-xs font-medium text-gray-500 py-1 uppercase"
            >
              <span className="hidden sm:inline">{formatDate(day, 'EEE')}</span>
              <span className="sm:hidden">{formatDate(day, 'EEE').charAt(0)}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Collapsed: Week Strip (Grid aligned with headers) */
            <motion.div
              key={`week-${format(weekDays[0], 'yyyy-MM-dd')}`}
              initial={{ opacity: 0, x: swipeDirection === 'right' ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDirection === 'right' ? -30 : 30 }}
              transition={{ duration: 0.15 }}
              className="touch-pan-y"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const eventCount = eventCountByDate[dateStr] || 0;
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'flex flex-col items-center py-2 rounded-lg transition-colors min-h-[48px]',
                        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500',
                        isSelected && !isTodayDate && 'bg-emerald-50',
                      )}
                    >
                      {/* Day number (No day name, already in header) */}
                      <span
                        className={cn(
                          'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                          isTodayDate
                            ? 'text-white bg-emerald-600'
                            : isSelected
                            ? 'text-emerald-700 bg-emerald-100'
                            : 'text-gray-700'
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Event dots */}
                      {eventCount > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 h-1 rounded-full bg-emerald-500"
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* Expanded: Full Calendar (Header hidden to avoid duplication) */
            <motion.div
              key="full-calendar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CalendarWidget
                events={events}
                onEventsChanged={onEventsChanged}
                hideHeader
                hideWeekdays // Hide internal header
                month={selectedDate}
                onMonthChange={setSelectedDate}
                memberColors={memberColors}
                className="border-none shadow-none bg-transparent py-0 gap-0"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
