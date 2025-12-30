
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { AdminOverviewClient } from './page-client';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const admin = getAdminClient();

  // 1. Security Check
  let session;
  try {
    session = await validateSession();
  } catch {
    redirect('/login');
  }

  const { data: user } = await admin.from('users').select('is_admin').eq('id', session.userId).single();
  if (!user?.is_admin) {
    redirect('/dashboard');
  }

  // 2. Fetch Data (e.g. Total Users)
  const { count } = await admin.from('users').select('*', { count: 'exact', head: true });

  return <AdminOverviewClient stats={{ totalUsers: count || 0 }} />;
}
