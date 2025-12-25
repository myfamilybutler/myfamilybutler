'use client';

/**
 * Delete Event Confirmation Dialog
 * 
 * A proper confirmation dialog for deleting events with clear messaging
 * and accessible touch targets.
 */

import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  eventTitle,
  isDeleting,
  onConfirm,
}: DeleteEventDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <AlertDialogTitle className="text-center">
            {t('calendar.deleteEvent')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            <span className="font-medium text-foreground">&quot;{eventTitle}&quot;</span>
            {' '}
            {t('calendar.deleteConfirmMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel 
            className="w-full sm:w-auto min-h-[44px]"
            disabled={isDeleting}
          >
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="w-full sm:w-auto min-h-[44px] bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
