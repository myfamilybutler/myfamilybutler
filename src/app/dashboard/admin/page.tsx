
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

  // Verify admin status
  const { data: user, error } = await admin.from('users').select('id, is_admin, display_name').eq('id', session.userId).single();
  
  if (error) {
    // Silent fail safely
  }

  if (!user?.is_admin) {
    redirect('/dashboard');
  }

  // 2. Fetch Data (e.g. Total Users)
  const { count } = await admin.from('users').select('*', { count: 'exact', head: true });

  return <AdminOverviewClient stats={{ totalUsers: count || 0 }} />;
}
