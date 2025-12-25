'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAddFabProps {
  onClick: () => void;
  className?: string;
}

export function QuickAddFab({ onClick, className }: QuickAddFabProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg',
        'bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-transform',
        'md:bottom-8 md:right-8',
        className
      )}
      aria-label="Add event"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
