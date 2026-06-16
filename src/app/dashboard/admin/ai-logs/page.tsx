import { getAdminClient } from '@/lib/supabase';
import { AILogsClient } from '@/app/dashboard/admin/ai-logs/page-client';
import { validateSession } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { logError } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export default async function AILogsPage() {
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

  // Fetch recent interactions
  const { data: logs, error } = await admin
    .from('ai_interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    logError('Failed to fetch AI logs:', error);
    return <div>Error loading logs</div>;
  }

  // Calculate simple stats
  const total = logs.length;
  const successes = logs.filter(l => l.was_successful).length;
  const successRate = total > 0 ? (successes / total) * 100 : 0;
  const avgLatency = logs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / (total || 1);

  return (
    <AILogsClient 
      initialLogs={logs} 
      stats={{
        total,
        successRate,
        avgLatency
      }}
    />
  );
}
