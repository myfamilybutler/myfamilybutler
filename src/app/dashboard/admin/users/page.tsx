import { getAdminClient } from '@/lib/supabase';
import { UsersClient } from '@/app/dashboard/admin/users/page-client';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const admin = getAdminClient();

  const { data: users, error } = await admin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50); // Pagination later

  if (error) {
    console.error('Failed to fetch users:', error);
    return <div>Error loading users</div>;
  }

  return <UsersClient initialUsers={users} />;
}
