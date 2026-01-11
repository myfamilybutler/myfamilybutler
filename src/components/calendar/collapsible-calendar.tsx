'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  isSameDay,
  isToday,
} from 'date-fns';
import { getWeekNumber } from '@/lib/utils/calendar-helpers';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DesktopCalendarGrid } from './desktop-calendar-grid';
import type { CalendarEvent } from '@/types/calendar';
import { DEFAULT_MEMBER_COLOR } from '@/lib/utils/ui-helpers';
import { useFamilyData } from '@/stores/family-store';

interface CollapsibleCalendarProps {
  events: CalendarEvent[];
  onEventsChanged?: () => void;
  defaultExpanded?: boolean;
}

export function CollapsibleCalendar({
  events,
  onEventsChanged,
  defaultExpanded = false,
}: CollapsibleCalendarProps) {
  const { memberColors } = useFamilyData();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');

  // Get current week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  // Group events by date and get unique colors for dots
  const eventColorsByDate = useMemo(() => {
    const colorsByDate: Record<string, string[]> = {};
    for (const event of events) {
      const date = event.event_date;
      if (!colorsByDate[date]) {
        colorsByDate[date] = [];
      }
      // Get color for this event's family member
      const color = event.family_member && memberColors.get(event.family_member)
        ? memberColors.get(event.family_member)!
        : DEFAULT_MEMBER_COLOR;
      // Add unique colors (max 3)
      if (!colorsByDate[date].includes(color) && colorsByDate[date].length < 3) {
        colorsByDate[date].push(color);
      }
    }
    return colorsByDate;
  }, [events, memberColors]);

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
    <Card className="border-border shadow-sm overflow-hidden bg-card">
      {/* Header - consistent layout with navigation */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center justify-between w-full gap-2">
          {/* Navigation arrows */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={isExpanded ? handlePrevMonth : handlePrevWeek}
              className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={isExpanded ? handleNextMonth : handleNextWeek}
              className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Title */}
          <h2 className="text-base font-semibold text-foreground capitalize flex-1 text-center">
            {formatDate(selectedDate, 'MMMM yyyy')}
          </h2>
          
          {/* Expand/Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent"
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
        {/* Persistent Week Day Headers */}
        {!isExpanded && (
          <div className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/50 -mx-6">
            <div className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground p-2 border-r border-border flex items-center justify-center">
              Wk
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-2 uppercase"
              >
                <span className="hidden sm:inline">{formatDate(day, 'EEE')}</span>
                <span className="sm:hidden">{formatDate(day, 'EEE').charAt(0)}</span>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Collapsed: Week Strip (Grid aligned with headers) */
            <motion.div
              key={`week-${format(weekDays[0], 'yyyy-MM-dd')}`}
              initial={{ opacity: 0, x: swipeDirection === 'right' ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDirection === 'right' ? -30 : 30 }}
              transition={{ duration: 0.15 }}
              className="touch-pan-y -mx-6"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-[32px_repeat(7,minmax(0,1fr))] border-b border-border">
                <div className="flex items-center justify-center text-xs font-medium text-muted-foreground border-r border-border bg-muted/20">
                  {getWeekNumber(weekDays[0])}
                </div>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayColors = eventColorsByDate[dateStr] || [];
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        'flex flex-col items-center py-2 transition-colors min-h-[48px] border-r border-border last:border-r-0',
                        'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500',
                        isSelected && !isTodayDate && 'bg-emerald-500/10',
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
                            : 'text-foreground'
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Colored event dots */}
                      {dayColors.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {dayColors.map((color, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: color }}
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
            /* Expanded: Full Calendar Grid (same as desktop) */
            <motion.div
              key="full-calendar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="-mx-6 -mb-6" // Extend to card edges
            >
              <DesktopCalendarGrid
                events={events}
                onEventsChanged={onEventsChanged}
                hideHeader
                month={selectedDate}
                onMonthChange={setSelectedDate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
