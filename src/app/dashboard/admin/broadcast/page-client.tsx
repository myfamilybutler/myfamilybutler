'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Send, Terminal, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/utils/logger';
import { fetchWithTimeout } from '@/lib/utils/fetch';

export function BroadcastClient() {
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSend = async (testOnly: boolean) => {
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    if (!confirm(testOnly ? 'Send TEST message to yourself?' : 'CONFIRM: Send to ALL users?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetchWithTimeout('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, channel, testOnly }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send broadcast');
      }

      setResult({ sent: data.sent, failed: data.failed });
      toast.success(testOnly ? 'Test sent!' : 'Broadcast complete!');
    } catch (error) {
      logError(error);
      toast.error(error instanceof Error ? error.message : 'Broadcast failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Broadcast System</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>
            Send a message to all active users via WhatsApp or Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                <SelectItem value="telegram">Telegram Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Hello! We are performing maintenance..."
              className="min-h-[150px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right border-t pt-2">
              Chars: {message.length}
            </p>
          </div>

          {result && (
            <Alert variant={result.failed > 0 ? "destructive" : "default"} className="bg-muted">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Result</AlertTitle>
              <AlertDescription>
                Success: {result.sent} | Failed: {result.failed}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:gap-4">
            <Button 
              variant="outline" 
              size="touch"
              className="w-full sm:w-auto"
              onClick={() => handleSend(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
              Send Preview
            </Button>
            <Button 
              variant="destructive"
              size="touch"
              className="flex-1" 
              onClick={() => handleSend(false)}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Broadcast to All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
