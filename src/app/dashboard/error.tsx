'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Start logging to error reporting service here if available
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full min-h-[400px] p-6">
      <Card className="max-w-md w-full border-destructive/25">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/15 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {error.message || "We encountered an unexpected error while loading your dashboard."}
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button 
              variant="destructive"
              onClick={() => reset()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
