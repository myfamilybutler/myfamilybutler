'use client';

import { useMemo } from 'react';
import { format, parseISO, isAfter, startOfDay, addDays } from 'date-fns';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import { cn, formatTime } from '@/lib/utils';
import type { CalendarEvent } from './calendar-widget';
import { EditEventDialog } from './edit-event-dialog';

import { getMemberColor } from '@/lib/events';

interface UpcomingEventsProps {
  events: CalendarEvent[];
  maxItems?: number;
  onEventsChanged?: () => void;
}

interface ProcessedEvent extends CalendarEvent {
  dateLabel: string;
}

export function UpcomingEvents({ events, maxItems = 5, onEventsChanged }: UpcomingEventsProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleEventUpdated = () => {
    onEventsChanged?.();
  };

  // Filter, sort, and process upcoming events with date labels
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    return events
      .filter((event) => {
        const eventDate = parseISO(event.event_date);
        return isAfter(eventDate, today) || event.event_date === todayStr;
      })
      .sort((a, b) => {
        // Sort by date first
        const dateCompare = a.event_date.localeCompare(b.event_date);
        if (dateCompare !== 0) return dateCompare;
        
        // Then by time (all-day events first)
        if (a.is_all_day && !b.is_all_day) return -1;
        if (!a.is_all_day && b.is_all_day) return 1;
        if (a.event_time && b.event_time) {
          return a.event_time.localeCompare(b.event_time);
        }
        return 0;
      })
      .slice(0, maxItems)
      .map((event): ProcessedEvent => {
        let dateLabel: string;
        if (event.event_date === todayStr) {
          dateLabel = 'Today';
        } else if (event.event_date === tomorrowStr) {
          dateLabel = 'Tomorrow';
        } else {
          dateLabel = format(parseISO(event.event_date), 'EEE, MMM d');
        }
        return { ...event, dateLabel };
      });
  }, [events, maxItems]);

  if (upcomingEvents.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">No upcoming events</p>
          <p className="text-xs text-gray-400 mt-1">Your schedule is clear!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming</h3>
        <div className="space-y-2">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer"
              onClick={() => handleEditClick(event)}
            >
              {/* Time column */}
              <div className="flex-shrink-0 w-16 text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {event.is_all_day ? 'All day' : formatTime(event.event_time)}
                </span>
                <p className="text-xs text-gray-500">{event.dateLabel}</p>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {event.title}
                </p>
                {event.family_member && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getMemberColor(event.family_member)
                      )}
                    />
                    <span className="text-xs text-gray-500">
                      {event.family_member}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditEventDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventUpdated}
      />
    </>
  );
}

