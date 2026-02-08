
import { redirect } from 'next/navigation';

// Imports removed as logic moved to client component
import { validateSession } from '@/lib/auth/helpers';
import { AutoJoiner } from './auto-joiner';

interface JoinPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const token = (params.token || params.id) as string | undefined;

  if (!token) {
    redirect('/dashboard?error=missing_token');
  }

  // 1. Check for authenticated session
  let userId: string | null = null;
  try {
    const session = await validateSession();
    userId = session.userId;
  } catch {
    // Not authenticated
  }

  // Render Client Component to handle the join process (Auth or Claim)
  // This provides a consistent "Joining..." UI and handles both flows.
  return (
      <AutoJoiner 
        token={token} 
        isLoggedIn={!!userId} 
      />
  );
}
