'use client';

import { format } from 'date-fns';
import { Clock, MapPin, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface CalendarEvent {
  id: string;
  title: string;
  event_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
}

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
          <SheetTitle className="text-xl font-semibold text-gray-900">
            {format(date, 'EEEE, MMMM d')}
          </SheetTitle>
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
                This day is free!
              </p>
              <Button className="mt-4" variant="outline">
                Add Event
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{events.length} event{events.length > 1 ? 's' : ''}</p>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  
                  {/* Time */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{event.is_all_day ? 'All day' : event.event_time}</span>
                  </div>
                  
                  {/* Family member */}
                  {event.family_member && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 mt-1">
                      <User className="w-4 h-4" />
                      <span>{event.family_member}</span>
                    </div>
                  )}
                  
                  {/* Location */}
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
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
