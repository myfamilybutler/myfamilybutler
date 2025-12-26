'use client';

import { format } from 'date-fns';
import { Clock, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CalendarEvent } from '@/components/calendar/calendar-widget';

export interface ScheduleWidgetProps {
  events: CalendarEvent[];
}

export function ScheduleWidget({ events }: ScheduleWidgetProps) {
  const today = new Date();
  const todayEvents = events; // Events are filtered by parent

  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Today
          </CardTitle>
          <span className="text-sm text-gray-500">
            {format(today, 'EEEE, MMM d')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {todayEvents.map((event) => (
          <div
            key={event.id}
            className="p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            {/* Title and time */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 shrink-0">
                {event.is_all_day ? 'All day' : (event.end_time ? `${event.event_time} - ${event.end_time}` : event.event_time)}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">
                {event.title}
              </span>
            </div>
            
            {/* Meta info: family member and location */}
            {(event.family_member || event.location) && (
              <div className="flex items-center gap-4 mt-1.5 ml-[68px]">
                {event.family_member && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <User className="w-3 h-3" />
                    <span>{event.family_member}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {todayEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No events today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
