'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { dbUser, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && (!dbUser || !dbUser.is_admin)) {
      console.warn('Unauthorized access attempt to Admin Dashboard');
      router.replace('/dashboard');
    }
  }, [dbUser, loading, router]);

  if (loading || !dbUser?.is_admin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
