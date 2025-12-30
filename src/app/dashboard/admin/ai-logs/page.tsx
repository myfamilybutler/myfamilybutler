import { getAdminClient } from '@/lib/supabase';
import { AILogsClient } from '@/app/dashboard/admin/ai-logs/page-client';

export const dynamic = 'force-dynamic';

export default async function AILogsPage() {
  const admin = getAdminClient();

  // Fetch recent interactions
  const { data: logs, error } = await admin
    .from('ai_interactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch AI logs:', error);
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
