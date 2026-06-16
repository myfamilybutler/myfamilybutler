import { getAdminClient } from '@/lib/supabase';
import { UsersClient } from '@/app/dashboard/admin/users/page-client';
import { validateSession } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { logError } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const admin = getAdminClient();
  
  // 1. Security Check
  let session;
  try {
    session = await validateSession();
  } catch {
    redirect('/login');
  }

  // Verify admin status
  const { data: user } = await admin.from('users').select('is_admin').eq('id', session.userId).single();
  if (!user?.is_admin) {
    redirect('/dashboard');
  }

  const { data: users, error } = await admin
    .from('users')
    .select('id, phone_number, display_name, subscription_status, created_at, onboarding_source, is_admin')
    .order('created_at', { ascending: false })
    .limit(50); // Pagination later

  if (error) {
    logError('Failed to fetch users:', error);
    return <div>Error loading users</div>;
  }

  return <UsersClient initialUsers={users} />;
}
