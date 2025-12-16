'use client';

import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  time: string;
  category: 'school' | 'medical' | 'activity' | 'reminder';
  description?: string;
}

const categoryColors: Record<CalendarEvent['category'], string> = {
  school: 'bg-blue-100 text-blue-700',
  medical: 'bg-red-100 text-red-700',
  activity: 'bg-purple-100 text-purple-700',
  reminder: 'bg-amber-100 text-amber-700',
};

const categoryLabels: Record<CalendarEvent['category'], string> = {
  school: 'School',
  medical: 'Medical',
  activity: 'Activity',
  reminder: 'Reminder',
};

interface DayDetailSheetProps {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DayDetailSheet({ date, events, open, onOpenChange }: DayDetailSheetProps) {
  if (!date) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold text-gray-900">
              {format(date, 'EEEE, MMMM d')}
            </SheetTitle>
          </div>
          <p className="text-sm text-gray-500">{format(date, 'yyyy')}</p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No events scheduled</p>
              <p className="text-sm text-gray-400 mt-1">
                This day is free! Enjoy the break.
              </p>
              <Button className="mt-4" variant="outline">
                Add Event
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{events.length} event{events.length > 1 ? 's' : ''} scheduled</p>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{event.time}</span>
                      </div>
                    </div>
                    <Badge className={categoryColors[event.category]} variant="secondary">
                      {categoryLabels[event.category]}
                    </Badge>
                  </div>
                  {event.description && (
                    <p className="mt-3 text-sm text-gray-600">{event.description}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
