'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { stopImpersonating } from '@/actions/admin-auth';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import i18n from '@/lib/config/i18n';
import { FamilyFilter } from './family-filter';
import { ThemeToggle } from './theme-toggle';

export function Navbar() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, dbUser, signOut } = useAuthStore();
  
  const [isImpersonating] = useState(
    typeof document !== 'undefined' && document.cookie.includes('impersonate_id')
  );

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Use dbUser (raw DB) for display, fallback to user (Supabase) for email
  const displayIdentifier = dbUser?.display_name || dbUser?.linked_email || dbUser?.phone_number || user?.email || 'Account';

  return (
    <div className="flex flex-col">
      {isImpersonating && (
        <div className="flex w-full items-center justify-center gap-4 bg-amber-500 p-2 text-sm font-bold text-white">
          <span>⚠️ You are impersonating a user</span>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => stopImpersonating()}
            className="h-6 text-xs"
          >
            Exit Impersonation
          </Button>
        </div>
      )}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">My Family Butler</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <FamilyFilter />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <span className="text-sm font-medium">{displayIdentifier}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('common.dashboard')}
                  </Link>
                </DropdownMenuItem>
                {dbUser?.is_admin && (
                  <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/admin" className="flex items-center gap-2 cursor-pointer font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                      <LayoutDashboard className="w-4 h-4" />
                      {t('common.admin')} (Admin)
                    </Link>
                  </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    {t('common.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const newLang = i18n.language === 'en' ? 'de' : 'en';
                    i18n.changeLanguage(newLang);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-lg leading-none pt-1">
                    {i18n.language === 'en' ? '🇺🇸' : '🇩🇪'}
                  </span>
                  {i18n.language === 'en' ? 'English' : 'Deutsch'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  {t('common.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    </div>
  );
}
