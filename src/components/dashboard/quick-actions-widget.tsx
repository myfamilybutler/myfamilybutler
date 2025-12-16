'use client';

import { CalendarPlus, UserPlus, Bell, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const quickActions: QuickAction[] = [
  { id: 'appointment', label: 'Add Appointment', icon: <CalendarPlus className="w-4 h-4" />, color: 'text-blue-600' },
  { id: 'member', label: 'Add Family Member', icon: <UserPlus className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'reminder', label: 'Set Reminder', icon: <Bell className="w-4 h-4" />, color: 'text-amber-600' },
  { id: 'document', label: 'Upload Document', icon: <FileText className="w-4 h-4" />, color: 'text-emerald-600' },
];

export function QuickActionsWidget() {
  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start gap-3 h-11 hover:bg-slate-100"
          >
            <span className={action.color}>{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
