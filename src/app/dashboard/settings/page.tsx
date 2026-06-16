import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInitialDashboardData } from '@/lib/dashboard/get-initial-dashboard-data';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const initialData = await getInitialDashboardData(user);

  if (!initialData) {
    redirect('/login');
  }

  return (
    <SettingsClient
      authUser={user}
      initialDbUser={initialData.user}
      initialFamily={initialData.family}
    />
  );
}
