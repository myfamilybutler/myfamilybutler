'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  isOnline?: boolean;
}

// Sample data - would come from Zustand/API in real app
const familyMembers: FamilyMember[] = [
  { id: '1', name: 'John Doe', role: 'Parent', initials: 'JD', color: 'bg-emerald-100 text-emerald-700', isOnline: true },
  { id: '2', name: 'Jane Doe', role: 'Parent', initials: 'JD', color: 'bg-blue-100 text-blue-700', isOnline: true },
  { id: '3', name: 'Emma Doe', role: 'Child', initials: 'ED', color: 'bg-purple-100 text-purple-700', isOnline: false },
  { id: '4', name: 'Max Doe', role: 'Child', initials: 'MD', color: 'bg-amber-100 text-amber-700', isOnline: false },
];

export function FamilyWidget() {
  return (
    <Card className="h-full border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Family Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="relative">
              <Avatar className={member.color}>
                <AvatarFallback className={member.color}>
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              {member.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              {member.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
