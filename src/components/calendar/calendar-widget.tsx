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
  isSameDay,
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
  date: Date;
  title: string;
  time: string;
  category: 'school' | 'medical' | 'activity' | 'reminder';
  description?: string;
}

const categoryColors: Record<CalendarEvent['category'], string> = {
  school: 'bg-blue-500',
  medical: 'bg-red-500',
  activity: 'bg-purple-500',
  reminder: 'bg-amber-500',
};

// Sample events - would come from API in real app
const sampleEvents: CalendarEvent[] = [
  { id: '1', date: new Date(), title: 'School Drop-off', time: '08:00', category: 'school', description: 'Drop Emma at Lincoln Elementary' },
  { id: '2', date: new Date(), title: 'Dentist', time: '10:30', category: 'medical', description: "Emma's regular checkup at Dr. Smith" },
  { id: '3', date: new Date(), title: 'Soccer', time: '15:30', category: 'activity', description: 'Soccer practice at City Sports Field' },
  { id: '4', date: new Date(new Date().setDate(new Date().getDate() + 2)), title: 'Parent Meeting', time: '18:00', category: 'school', description: 'PTA meeting at school auditorium' },
  { id: '5', date: new Date(new Date().setDate(new Date().getDate() + 5)), title: 'Swimming', time: '14:00', category: 'activity', description: 'Swimming lessons for Max' },
  { id: '6', date: new Date(new Date().setDate(new Date().getDate() + 7)), title: 'Doctor Checkup', time: '09:00', category: 'medical', description: 'Annual checkup for John' },
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
    return sampleEvents.filter((event) => isSameDay(event.date, day));
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
                    
                    {/* Event pills */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            categoryColors[event.category]
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-gray-400 ml-0.5">
                          +{dayEvents.length - 3}
                        </span>
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
        onOpenChange={(open) => !open && setSelectedDate(null)}
      />
    </>
  );
}
