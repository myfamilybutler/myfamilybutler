'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar } from 'lucide-react';
import { formatTime, cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EditEventDialog } from './edit-event-dialog';
import { EventDetailDialog } from './event-detail-dialog';
import type { CalendarEvent } from '@/types/calendar';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/utils';
import { getMemberColor, getInitials } from '@/lib/utils/ui-helpers';

interface DayDetailDialogProps {
  date: Date | null;
  events: CalendarEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventsChanged?: () => void;
}

export function DayDetailDialog({
  date,
  events,
  open,
  onOpenChange,
  onEventsChanged,
}: DayDetailDialogProps) {
  const { t } = useTranslation();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (!date) return null;

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-[calc(100%-1rem)] sm:max-w-xl flex flex-col p-0 gap-0">
          <DialogHeader className="rounded-t-lg border-b bg-card px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-11 w-11 flex-col items-center justify-center rounded-lg border shadow-sm font-semibold bg-card sm:h-12 sm:w-12",
                isToday ? "border-emerald-500 text-emerald-700 dark:text-emerald-400" : "border-border text-foreground"
              )}>
                <span className="text-[10px] uppercase tracking-wider">{formatDate(date, 'MMM')}</span>
                <span className="text-xl leading-none">{formatDate(date, 'd')}</span>
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {formatDate(date, 'EEEE')}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-0.5">
                  <span>{formatDate(date, 'PPP')}</span>
                  {isToday && (
                    <Badge variant="success" size="xs">
                      {t('calendar.today')}
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-muted/50 p-4 sm:p-6">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">{t('calendar.noEvents')}</h3>
                <p className="max-w-xs text-xs text-muted-foreground">
                  {t('calendar.noEventsDay')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const pillColor = getMemberColor(event.family_member);

                  return (
                    <Card
                      key={event.id}
                      className="group border-0 shadow-sm hover:shadow transition-all overflow-hidden bg-card cursor-pointer ring-1 ring-border/50"
                      onClick={() => {
                        setSelectedEvent(event);
                        setDetailOpen(true);
                      }}
                    >
                      <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                        <div className="w-14 shrink-0 flex flex-col items-end pt-0.5 gap-0.5 sm:w-16">
                          {event.is_all_day ? (
                            <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{t('calendar.allDay')}</span>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-foreground">
                                {formatTime(event.event_time)}
                              </span>
                              {event.end_time && (
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {formatTime(event.end_time)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className={cn("w-1 rounded-full self-stretch opacity-60", pillColor)} />

                        <div className="flex-1 min-w-0 grid gap-1">
                          <h4 className="font-semibold text-sm text-foreground leading-snug truncate">
                            {event.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {event.location && (
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}

                            {event.family_member && (
                              <div className="flex items-center gap-1.5 shrink-0 bg-muted px-1.5 py-0.5 rounded border border-border">
                                <Avatar className="h-3.5 w-3.5">
                                  <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                                    {getInitials(event.family_member)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-medium text-muted-foreground max-w-20 sm:max-w-28 truncate">
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

      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(event) => {
          setDetailOpen(false);
          setEditingEvent(event);
          setEditDialogOpen(true);
        }}
      />

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
