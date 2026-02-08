'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface QuickAddFabProps {
  onClick: () => void;
  className?: string;
}

export function QuickAddFab({ onClick, className }: QuickAddFabProps) {
  const { t } = useTranslation();

  return (
    <Button
      onClick={onClick}
      variant="brand"
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg',
        'active:scale-95 transition-transform',
        'md:bottom-8 md:right-8',
        className
      )}
      aria-label={t('calendar.addEvent')}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
