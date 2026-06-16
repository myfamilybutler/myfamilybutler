'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  phone_number?: string;
  display_name?: string;
  subscription_status: string;
  created_at: string;
  onboarding_source?: string;
  is_admin?: boolean;
}

export function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = initialUsers.filter(user => 
    user.phone_number?.includes(searchTerm) || 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">User Manager</h1>
        <Button size="touch" className="w-full sm:w-auto">Add User</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search phones..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.display_name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">{user.phone_number}</div>
                  {user.is_admin && (
                    <Badge variant="secondary" size="xs" className="mt-1">Admin</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={user.subscription_status === 'active' ? 'default' : 'outline'} size="xs">
                    {user.subscription_status}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">
                  {user.onboarding_source || 'Unknown'}
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-9 w-9 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Logs</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Ban User</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
