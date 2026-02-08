'use client';

/**
 * Google Calendar Connect Button
 * 
 * Allows users to connect their Google Calendar for automatic event sync.
 * After connecting, users can select which calendar to sync with.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Check, Loader2, Link2Off } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleCalendar {
  id: string;
  name: string;
  primary: boolean;
}

interface GoogleCalendarConnectButtonProps {
  userId?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function GoogleCalendarConnectButton({
  onConnected,
  onDisconnected,
}: GoogleCalendarConnectButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Calendar selection state
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');
  const [selectedCalendarName, setSelectedCalendarName] = useState<string | null>(null);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);

  const mountedRef = useRef(true);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);

  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
  }, [onDisconnected]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/auth/google/status?t=${Date.now()}`);
      const data = await response.json();
      if (!mountedRef.current) return;

      setIsConnected(data.connected);
      
      if (data.connected) {
        // Set current selection from server
        if (data.calendarId) {
          setSelectedCalendarId(data.calendarId);
        }
        if (data.calendarName) {
          setSelectedCalendarName(data.calendarName);
        }
        onConnectedRef.current?.();
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchCalendars = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoadingCalendars(true);
    try {
      const response = await fetch('/api/auth/google/calendars');
      const data = await response.json();
      if (!mountedRef.current) return;
      
      if (data.calendars) {
        setCalendars(data.calendars);
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
      toast.error('Kalender konnten nicht geladen werden');
    } finally {
      if (mountedRef.current) {
        setIsLoadingCalendars(false);
      }
    }
  }, [isConnected]);

  // Check connection status on mount
  useEffect(() => {
    void checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Fetch calendars when connected
  useEffect(() => {
    if (isConnected) {
      void fetchCalendars();
    }
  }, [isConnected, fetchCalendars]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get the OAuth URL from our API
      const response = await fetch('/api/auth/google/connect');
      const data = await response.json();

      if (data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      } else {
        toast.error('Google-Verbindung konnte nicht gestartet werden');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Verbindung zu Google fehlgeschlagen');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        if (!mountedRef.current) return;
        setIsConnected(false);
        setCalendars([]);
        setSelectedCalendarId('primary');
        setSelectedCalendarName(null);
        toast.success('Google Kalender wurde getrennt');
        onDisconnectedRef.current?.();
      } else {
        toast.error('Google Kalender konnte nicht getrennt werden');
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Trennen fehlgeschlagen');
    } finally {
      if (mountedRef.current) {
        setIsConnecting(false);
      }
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    const calendar = calendars.find(c => c.id === calendarId);
    if (!calendar) return;

    setIsSavingCalendar(true);
    try {
      const response = await fetch('/api/auth/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: calendar.id,
          calendarName: calendar.name,
        }),
      });

      if (response.ok) {
        if (!mountedRef.current) return;
        setSelectedCalendarId(calendar.id);
        setSelectedCalendarName(calendar.name);
        toast.success(`Synchronisiere mit "${calendar.name}"`);
      } else {
        toast.error('Kalenderauswahl konnte nicht gespeichert werden');
      }
    } catch (error) {
      console.error('Error saving calendar:', error);
      toast.error('Kalenderauswahl konnte nicht gespeichert werden');
    } finally {
      if (mountedRef.current) {
        setIsSavingCalendar(false);
      }
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Pruefe Verbindung...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col gap-3">
        {/* Connected Status */}
        <Button variant="outline" disabled className="w-full">
          <Check className="w-4 h-4 mr-2 text-emerald-600" />
          Google Kalender verbunden
        </Button>

        {/* Calendar Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Mit Kalender synchronisieren:
          </label>
          {isLoadingCalendars ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Lade Kalender...
            </div>
          ) : calendars.length > 0 ? (
            <Select
              value={selectedCalendarId}
              onValueChange={handleCalendarChange}
              disabled={isSavingCalendar}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kalender auswaehlen">
                  {selectedCalendarName || 'Primaerkalender'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    {calendar.name}
                    {calendar.primary && (
                      <span className="ml-2 text-xs text-muted-foreground">(Primaer)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
               Keine beschreibbaren Kalender gefunden
            </p>
          )}
        </div>

        {/* Disconnect Button */}
        <Button
          variant="destructiveGhost"
          size="sm"
          onClick={handleDisconnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Link2Off className="w-4 h-4 mr-1" />
          )}
          Trennen
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleConnect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Calendar className="w-4 h-4 mr-2" />
      )}
      Google Kalender verbinden
    </Button>
  );
}
