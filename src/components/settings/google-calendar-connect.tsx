'use client';

/**
 * Google Calendar Connect Button
 * 
 * Allows users to connect their Google Calendar for automatic event sync.
 * Uses a dedicated OAuth flow with calendar scopes.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Check, Loader2, Link2Off } from 'lucide-react';
import { toast } from 'sonner';

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

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      setIsConnected(data.connected);
      // Call onConnected if already connected (e.g., after OAuth redirect)
      if (data.connected) {
        onConnected?.();
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onConnected]);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

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
        toast.error('Failed to start Google connection');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Failed to connect to Google');
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
        setIsConnected(false);
        toast.success('Google Calendar disconnected');
        onDisconnected?.();
      } else {
        toast.error('Failed to disconnect Google Calendar');
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Failed to disconnect');
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-full">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" disabled className="w-full text-emerald-600 border-emerald-200">
          <Check className="w-4 h-4 mr-2" />
          Google Calendar Connected
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-red-600"
          onClick={handleDisconnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Link2Off className="w-4 h-4 mr-1" />
          )}
          Disconnect
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
      Connect Google Calendar
    </Button>
  );
}
