import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, Plus } from 'lucide-react';
import { formatTime, cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EditEventDialog } from './edit-event-dialog';
import type { CalendarEvent } from '@/types/calendar';

interface DayDetailDialogProps {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventsChanged?: () => void;
}

import { getMemberColor, getInitials } from '@/lib/events';

export function DayDetailDialog({ 
  date, 
  events, 
  open, 
  onOpenChange,
  onEventsChanged 
}: DayDetailDialogProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (!date) return null;

  const handleEditClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };



  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b bg-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-12 w-12 flex-col items-center justify-center rounded-lg border shadow-sm font-semibold bg-white",
                  isToday ? "border-emerald-500 text-emerald-700" : "border-slate-200 text-slate-700"
                )}>
                  <span className="text-[10px] uppercase tracking-wider">{format(date, 'MMM')}</span>
                  <span className="text-xl leading-none">{format(date, 'd')}</span>
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    {format(date, 'EEEE')}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <span>{format(date, 'MMMM d, yyyy')}</span>
                    {isToday && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Today
                      </Badge>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No events</h3>
                <p className="text-xs text-slate-400 mb-4 max-w-[200px]">
                  No events scheduled for this day.
                </p>
                <Button size="sm" className="gap-2" onClick={() => {/* TODO: Add event handler */}}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const pillColor = getMemberColor(event.family_member);
                  
                  return (
                    <Card 
                      key={event.id}
                      className="group border-0 shadow-sm hover:shadow transition-all overflow-hidden bg-white cursor-pointer ring-1 ring-slate-200/50"
                      onClick={() => handleEditClick(event)}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        {/* Time or All Day */}
                        <div className="w-14 shrink-0 flex flex-col items-end pt-0.5 gap-0.5">
                          {event.is_all_day ? (
                            <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">All Day</span>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-slate-700">
                                {formatTime(event.event_time)}
                              </span>
                              {event.end_time && (
                                <span className="text-[10px] sm:text-xs text-slate-400">
                                  {formatTime(event.end_time)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Divider */}
                        <div className={cn("w-1 rounded-full self-stretch opacity-60", pillColor)} />

                        {/* Content */}
                        <div className="flex-1 min-w-0 grid gap-1">
                          <h4 className="font-semibold text-sm text-slate-900 leading-snug truncate">
                            {event.title}
                          </h4>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {event.location && (
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            
                            {event.family_member && (
                              <div className="flex items-center gap-1.5 ml-auto shrink-0 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                <Avatar className="h-3.5 w-3.5">
                                  <AvatarFallback className="text-[6px] bg-slate-200 text-slate-600">
                                    {getInitials(event.family_member)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-medium text-slate-600 max-w-[60px] truncate">
                                  {event.family_member}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditEventDialog
        event={editingEvent}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEventUpdated={onEventsChanged}
        onEventDeleted={onEventsChanged}
      />
    </>
  );
}
