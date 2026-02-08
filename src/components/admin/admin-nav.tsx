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
    <nav className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 sm:mb-8 sm:gap-3">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            pathname === item.href
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
