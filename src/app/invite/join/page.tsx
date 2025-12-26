
import { redirect } from 'next/navigation';
import { getInviteByToken, getInviteById, acceptInvite } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';

interface JoinPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const token = params.token as string | undefined;
  const inviteId = params.id as string | undefined;

  if (!token && !inviteId) {
    redirect('/dashboard?error=missing_token');
  }

  // 1. Check for authenticated session
  let userId: string | null = null;
  try {
    const session = await validateSession();
    userId = session.userId;
  } catch {
    // Not authenticated - redirect to login
    // Encoded redirect ensures they come back here after login
    const queryParam = token ? `token=${token}` : `id=${inviteId}`;
    const returnUrl = encodeURIComponent(`/invite/join?${queryParam}`);
    redirect(`/login?returnUrl=${returnUrl}`);
  }

  // 2. Lookup invite
  let invite = null;
  
  if (token) {
      // QR Code invite
      invite = await getInviteByToken(token);
  } else if (inviteId) {
      // Email invite
      invite = await getInviteById(inviteId);
  }

  if (!invite) {
    redirect('/dashboard?error=invalid_or_expired_invite');
  }

  // 3. Accept invite
  const success = await acceptInvite(userId, invite.inviteId, invite.householdId);

  if (!success) {
    redirect('/dashboard?error=invite_failed');
  }

  // 4. Redirect to dashboard on success
  redirect('/dashboard?joined=true');
}
