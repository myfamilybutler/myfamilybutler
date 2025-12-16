'use client';

import { format } from 'date-fns';
import { Clock, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ScheduleEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
}

// Sample data - would come from Supabase in real app
const todayEvents: ScheduleEvent[] = [
  { id: '1', title: 'School Drop-off', event_date: '2024-12-16', event_time: '08:00', is_all_day: false, family_member: 'Emma', location: 'Lincoln Elementary' },
  { id: '2', title: 'Dentist Appointment', event_date: '2024-12-16', event_time: '10:30', is_all_day: false, family_member: 'Max', location: 'Dr. Smith' },
  { id: '3', title: 'Soccer Practice', event_date: '2024-12-16', event_time: '15:30', is_all_day: false, family_member: 'Emma', location: 'City Field' },
  { id: '4', title: 'School Trip', event_date: '2024-12-16', is_all_day: true, family_member: 'Max' },
];

export function ScheduleWidget() {
  const today = new Date();

  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
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
              <span className="text-sm font-medium text-gray-500 w-14 shrink-0">
                {event.is_all_day ? 'All day' : event.event_time}
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
