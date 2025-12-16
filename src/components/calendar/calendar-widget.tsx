'use client';

import { useState } from 'react';
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

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
}

// Sample events - would come from Supabase in real app
const sampleEvents: CalendarEvent[] = [
  { id: '1', title: 'School Drop-off', event_date: format(new Date(), 'yyyy-MM-dd'), event_time: '08:00', is_all_day: false, family_member: 'Emma', location: 'Lincoln Elementary' },
  { id: '2', title: 'Dentist', event_date: format(new Date(), 'yyyy-MM-dd'), event_time: '10:30', is_all_day: false, family_member: 'Max', location: 'Dr. Smith' },
  { id: '3', title: 'Soccer', event_date: format(new Date(), 'yyyy-MM-dd'), event_time: '15:30', is_all_day: false, family_member: 'Emma' },
  { id: '4', title: 'Parent Meeting', event_date: format(new Date(new Date().setDate(new Date().getDate() + 2)), 'yyyy-MM-dd'), event_time: '18:00', is_all_day: false },
  { id: '5', title: 'Swimming', event_date: format(new Date(new Date().setDate(new Date().getDate() + 5)), 'yyyy-MM-dd'), event_time: '14:00', is_all_day: false, family_member: 'Max' },
  { id: '6', title: 'School Trip', event_date: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'), is_all_day: true, family_member: 'Emma' },
];

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [direction, setDirection] = useState(0);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return sampleEvents.filter((event) => event.event_date === dayStr);
  };

  const handlePrevMonth = () => {
    setDirection(-1);
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setDirection(1);
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <>
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentMonth.toISOString()}
              initial={{ x: direction * 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -50, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-7 gap-1"
            >
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'relative aspect-square p-1 rounded-xl text-sm transition-colors',
                      'hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1',
                      !isCurrentMonth && 'text-gray-300',
                      isCurrentMonth && 'text-gray-900',
                      isTodayDate && 'bg-emerald-50 ring-2 ring-emerald-500 font-semibold'
                    )}
                  >
                    <span className={cn(
                      'absolute top-1 left-1/2 -translate-x-1/2 text-xs',
                      isTodayDate && 'text-emerald-700'
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Simple dot for days with events */}
                    {hasEvents && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
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
      />
    </>
  );
}
