import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInitialDashboardData } from '@/lib/dashboard/get-initial-dashboard-data';
import { DashboardClient } from './dashboard-client';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  const { user: dbUser } = initialData;

  if (!dbUser.household_id) {
    redirect('/onboarding');
  }

  return (
    <DashboardClient
      authUser={user}
      dbUser={dbUser}
      initialEvents={initialData.events}
      initialFamily={initialData.family}
    />
  );
}
