
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function WhoAmIPage() {
  const admin = getAdminClient();
  let session = null;
  let error = null;
  let dbUser = null;

  try {
    session = await validateSession();
    // Fetch user details including is_admin
    const { data } = await admin.from('users').select('*').eq('id', session.userId).single();
    dbUser = data;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown validation error';
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">🕵️ Admin Debugger (Who Am I?)</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Session (Cookies)</CardTitle></CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded text-xs font-mono overflow-auto">
              {JSON.stringify({ 
                sessionUserId: session?.userId || 'null', 
                sessionType: session?.type || 'null',
                validationError: error 
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Database Record</CardTitle></CardHeader>
          <CardContent>
             <pre className="bg-slate-100 p-4 rounded text-xs font-mono overflow-auto">
              {dbUser ? JSON.stringify(dbUser, null, 2) : 'User not found in DB'}
            </pre>
            <div className={`mt-4 p-4 rounded font-bold text-center ${dbUser?.is_admin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              IS ADMIN: {dbUser?.is_admin ? 'YES ✅' : 'NO ❌'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold text-blue-800">Troubleshooting Guide</h3>
        <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
          <li><strong>IDs don&apos;t match?</strong> You might be logged in as a different user. Try logging out and back in.</li>
          <li><strong>User not found?</strong> Your cookie `session_user_id` might be stale or invalid.</li>
          <li><strong>Not Admin?</strong> The database says `is_admin` is false. Run the SQL fix script.</li>
        </ul>
      </div>
    </div>
  );
}
