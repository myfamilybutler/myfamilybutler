'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Activity, Radio } from 'lucide-react';

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/dashboard/admin/users',
    icon: Users,
  },
  {
    title: 'AI Logs',
    href: '/dashboard/admin/ai-logs',
    icon: Activity,
  },
  {
    title: 'Broadcast',
    href: '/dashboard/admin/broadcast',
    icon: Radio,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mb-8 overflow-x-auto pb-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary flex items-center gap-2',
            pathname === item.href
              ? 'text-primary border-b-2 border-primary pb-1'
              : 'text-muted-foreground pb-1'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
