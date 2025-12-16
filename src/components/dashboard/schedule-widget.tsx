'use client';

import { format } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScheduleEvent {
  id: string;
  title: string;
  time: string;
  location?: string;
  category: 'school' | 'medical' | 'activity' | 'reminder';
}

const categoryColors: Record<ScheduleEvent['category'], string> = {
  school: 'bg-blue-100 text-blue-700',
  medical: 'bg-red-100 text-red-700',
  activity: 'bg-purple-100 text-purple-700',
  reminder: 'bg-amber-100 text-amber-700',
};

const categoryLabels: Record<ScheduleEvent['category'], string> = {
  school: 'School',
  medical: 'Medical',
  activity: 'Activity',
  reminder: 'Reminder',
};

// Sample data - would come from API in real app
const todayEvents: ScheduleEvent[] = [
  { id: '1', title: 'School Drop-off', time: '08:00', location: 'Lincoln Elementary', category: 'school' },
  { id: '2', title: 'Dentist Appointment - Emma', time: '10:30', location: 'Dr. Smith Clinic', category: 'medical' },
  { id: '3', title: 'Soccer Practice', time: '15:30', location: 'City Sports Field', category: 'activity' },
  { id: '4', title: 'Pick up groceries', time: '17:00', category: 'reminder' },
];

export function ScheduleWidget() {
  const today = new Date();

  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Upcoming Schedule
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            {format(today, 'EEEE, MMM d')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex-shrink-0 w-12 text-center">
              <span className="text-sm font-semibold text-gray-900">{event.time}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
              {event.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 truncate">{event.location}</span>
                </div>
              )}
            </div>
            <Badge className={categoryColors[event.category]} variant="secondary">
              {categoryLabels[event.category]}
            </Badge>
          </div>
        ))}

        {todayEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No events scheduled for today</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
