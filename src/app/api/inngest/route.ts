// ===========================================
// Inngest API Route Handler
// ===========================================
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { functions as reminderFunctions } from '@/inngest/reminder-functions';
import { processMessage } from '@/inngest/process-message';
import { maintenanceFunctions } from '@/inngest/maintenance-functions';

const functions = [
  ...reminderFunctions,
  processMessage,
  ...maintenanceFunctions,
];

// Create and export the serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
