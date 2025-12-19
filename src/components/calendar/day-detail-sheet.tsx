'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, User, Pencil, Calendar, Bell, FileText, Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditEventDialog } from './edit-event-dialog';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
}

interface DayDetailSheetProps {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventsChanged?: () => void;
}

// Color mapping for family members (left border accent)
const MEMBER_COLORS: Record<string, string> = {
  default: 'border-l-emerald-500 bg-emerald-50/50',
  mom: 'border-l-blue-500 bg-blue-50/50',
  dad: 'border-l-purple-500 bg-purple-50/50',
  kids: 'border-l-orange-500 bg-orange-50/50',
};

function getMemberStyle(member?: string): string {
  if (!member) return MEMBER_COLORS.default;
  const lowerMember = member.toLowerCase();
  if (lowerMember.includes('mom') || lowerMember.includes('mama') || lowerMember.includes('mutter')) {
    return MEMBER_COLORS.mom;
  }
  if (lowerMember.includes('dad') || lowerMember.includes('papa') || lowerMember.includes('vater')) {
    return MEMBER_COLORS.dad;
  }
  if (lowerMember.includes('kid') || lowerMember.includes('child') || lowerMember.includes('kind')) {
    return MEMBER_COLORS.kids;
  }
  return MEMBER_COLORS.default;
}

export function DayDetailSheet({ 
  date, 
  events, 
  open, 
  onOpenChange,
  onEventsChanged 
}: DayDetailSheetProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (!date) return null;

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleEventUpdated = () => {
    onEventsChanged?.();
  };

  const handleEventDeleted = () => {
    onEventsChanged?.();
  };

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {/* Header */}
          <SheetHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isToday ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <Calendar className={`w-6 h-6 ${isToday ? 'text-emerald-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <SheetTitle className="text-xl font-semibold text-gray-900">
                  {format(date, 'EEEE, MMMM d')}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-gray-500">{format(date, 'yyyy')}</span>
                  {isToday && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Today
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-4 pb-6">
            {events.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <Calendar className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-600 font-medium text-lg">No events scheduled</p>
                <p className="text-sm text-gray-400 mt-1 max-w-[200px]">
                  This day is free! You can add events via WhatsApp or the calendar.
                </p>
                <Button className="mt-6 gap-2" variant="outline">
                  <Plus className="w-4 h-4" />
                  Add Event
                </Button>
              </div>
            ) : (
              <>
                {/* Event count */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-600">
                    {events.length} event{events.length > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Event cards */}
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-xl border-l-4 border border-slate-200 transition-all hover:shadow-md cursor-pointer ${getMemberStyle(event.family_member)}`}
                    onClick={() => handleEditClick(event)}
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">
                          {event.title}
                        </h3>
                        
                        {/* All-day badge or time */}
                        <div className="flex items-center gap-2 mt-2">
                          {event.is_all_day ? (
                            <Badge variant="secondary" className="text-xs">
                              All day
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">
                                {event.event_time}
                                {event.end_time && ` – ${event.end_time}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(event);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Details section */}
                    <div className="mt-3 space-y-2">
                      {/* Family member */}
                      {event.family_member && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-700 font-medium">{event.family_member}</span>
                        </div>
                      )}
                      
                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {/* Description */}
                      {event.description && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 pt-1">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <p className="line-clamp-2">{event.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick action hint */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">Click to edit</span>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Bell className="w-3 h-3" />
                        <span>Add reminder</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <EditEventDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />
    </>
  );
}


