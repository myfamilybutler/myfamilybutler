'use server';

import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export async function impersonateUser(targetUserId: string) {
  // 1. Validate CURRENT session (must be real admin)
  const cookieStore = await cookies();
  const realUserId = cookieStore.get('session_user_id')?.value;

  if (!realUserId) {
    throw new Error('Not authenticated');
  }

  const admin = getAdminClient();
  const { data: user } = await admin.from('users').select('is_admin').eq('id', realUserId).single();

  if (!user?.is_admin) {
    throw new Error('Unauthorized: Admin access required');
  }

  // 2. Set Impersonation Cookie
  cookieStore.set('impersonate_id', targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  redirect('/dashboard');
}

export async function stopImpersonating() {
  const cookieStore = await cookies();
  cookieStore.delete('impersonate_id');
  redirect('/dashboard/admin/users');
}
