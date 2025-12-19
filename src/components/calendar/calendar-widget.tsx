'use client';

import { useState, useMemo, useCallback } from 'react';
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
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DayDetailSheet } from './day-detail-sheet';

export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
}

// Color mapping for family members
const MEMBER_COLORS: Record<string, string> = {
  default: 'bg-emerald-500',
  mom: 'bg-blue-500',
  dad: 'bg-purple-500',
  kids: 'bg-orange-500',
};

function getMemberColor(member?: string): string {
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  return MEMBER_COLORS[lowerMember] || MEMBER_COLORS.default;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 2;

export interface CalendarWidgetProps {
  events: CalendarEvent[];
  selectedMembers?: string[];
  onEventsChanged?: () => void;
}

export function CalendarWidget({ events, selectedMembers, onEventsChanged }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [direction, setDirection] = useState(0);

  // Filter events by selected members
  const filteredEvents = useMemo(() => {
    if (!selectedMembers || selectedMembers.length === 0) {
      return events;
    }
    return events.filter((event) => {
      if (!event.family_member) return true; // Show events without a family member
      return selectedMembers.includes(event.family_member);
    });
  }, [events, selectedMembers]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = useCallback((day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredEvents.filter((event) => event.event_date === dayStr);
  }, [filteredEvents]);

  const handlePrevMonth = () => {
    setDirection(-1);
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setDirection(1);
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    if (format(currentMonth, 'yyyy-MM') !== format(today, 'yyyy-MM')) {
      setDirection(today > currentMonth ? 1 : -1);
      setCurrentMonth(today);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const isTodayVisible = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <>
      <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Month/Year title */}
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
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
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] sm:text-xs font-medium text-gray-500 py-1"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentMonth.toISOString()}
              initial={{ x: direction * 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -30, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-7 gap-0.5 sm:gap-1"
            >
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
                      'relative min-h-[52px] sm:min-h-[72px] p-0.5 sm:p-1 rounded-lg text-sm transition-colors flex flex-col',
                      'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1',
                      !isCurrentMonth && 'opacity-40',
                      isTodayDate && 'bg-emerald-50 ring-1 ring-emerald-300'
                    )}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        'text-[11px] sm:text-xs font-medium self-center mb-0.5',
                        isTodayDate ? 'text-emerald-700 font-bold' : 'text-gray-900',
                        !isCurrentMonth && 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Event strips (Google Calendar style) */}
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {visibleEvents.map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            'h-[14px] sm:h-4 rounded px-1 flex items-center',
                            getMemberColor(event.family_member)
                          )}
                        >
                          <span className="text-[8px] sm:text-[10px] font-medium text-white truncate leading-none">
                            {event.title}
                          </span>
                        </div>
                      ))}
                      
                      {/* Overflow indicator */}
                      {overflowCount > 0 && (
                        <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium px-1">
                          +{overflowCount} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <DayDetailSheet
        date={selectedDate}
        events={selectedDayEvents}
        open={selectedDate !== null}
        onOpenChange={(open: boolean) => !open && setSelectedDate(null)}
        onEventsChanged={onEventsChanged}
      />
    </>
  );
}
