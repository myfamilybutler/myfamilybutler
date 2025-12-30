'use client';

import { AdminGuard } from '@/lib/auth/admin-guard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Activity,
  LogOut,
  Radio
} from 'lucide-react';

const ADMIN_NAV = [
  { 
    title: 'Overview', 
    href: '/dashboard/admin', 
    icon: LayoutDashboard 
  },
  { 
    title: 'User Manager', 
    href: '/dashboard/admin/users', 
    icon: Users 
  },
  { 
    title: 'AI Observability', 
    href: '/dashboard/admin/ai-logs', 
    icon: Activity 
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50/50">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-20 w-64 border-r bg-white pb-4 pt-16">
          <div className="flex h-full flex-col px-4">
            <div className="py-4">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin Suite
              </h2>
              <nav className="space-y-2">
                {ADMIN_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-auto border-t pt-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-100 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                Exit Admin
              </Link>
              {/* Added Broadcast link */}
              <Link
                href="/dashboard/admin/broadcast"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === '/dashboard/admin/broadcast'
                    ? "bg-primary text-primary-foreground" // Using primary styles for consistency
                    : "text-muted-foreground hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Radio className="h-4 w-4" />
                Broadcast
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 pl-64 pt-16">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
