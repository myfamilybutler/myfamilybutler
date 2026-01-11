'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Activity, CheckCircle, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Log {
  id: string;
  created_at: string;
  user_message: string;
  intent_detected: string;
  confidence?: number;
  was_successful: boolean;
  latency_ms: number;
  ai_output: unknown;
  error_message?: string;
  channel: string;
}

interface Stats {
  total: number;
  successRate: number;
  avgLatency: number;
}

export function AILogsClient({ initialLogs, stats }: { initialLogs: Log[], stats: Stats }) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Prepare chart data (Last 7 days mock or simple distribution)
  // For now, let's just bin latency for a histogram feel or success/fail count
  const chartData = [
    { name: 'Success', value: stats.successRate, fill: 'hsl(var(--chart-2))' },
    { name: 'Failure', value: 100 - stats.successRate, fill: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">AI Observability</h1>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgLatency)}ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Main Table */}
        <Card className="md:col-span-5">
           <CardHeader>
             <CardTitle>Recent Interactions</CardTitle>
           </CardHeader>
           <CardContent>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-[100px]">Time</TableHead>
                   <TableHead>Message</TableHead>
                   <TableHead>Intent</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Latency</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {initialLogs.map((log) => (
                   <>
                     <TableRow 
                       key={log.id} 
                       className="cursor-pointer hover:bg-muted/50"
                       onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                     >
                       <TableCell className="font-medium text-xs text-muted-foreground">
                         {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                       </TableCell>
                       <TableCell className="max-w-[200px] truncate font-medium">
                         {log.user_message}
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">{log.intent_detected}</Badge>
                       </TableCell>
                       <TableCell>
                         {log.was_successful ? (
                           <Badge variant="success">Success</Badge>
                         ) : (
                           <Badge variant="destructive">Error</Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-right text-xs">
                         {log.latency_ms}ms
                       </TableCell>
                     </TableRow>
                     {expandedLog === log.id && (
                       <TableRow>
                         <TableCell colSpan={5} className="bg-muted/50 p-4">
                           <div className="rounded-md bg-slate-950 p-4 text-xs font-mono text-slate-50">
                             <pre className="whitespace-pre-wrap">
                               {JSON.stringify(log.ai_output, null, 2)}
                             </pre>
                             {log.error_message && (
                               <div className="mt-4 border-t border-slate-800 pt-4 text-red-400">
                                 Error: {log.error_message}
                               </div>
                             )}
                           </div>
                         </TableCell>
                       </TableRow>
                     )}
                   </>
                 ))}
               </TableBody>
             </Table>
           </CardContent>
        </Card>

        {/* Charts Side Panel */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
