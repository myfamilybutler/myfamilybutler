/**
 * Inngest Maintenance Functions
 */

import { inngest } from '@/lib/inngest';
import { cleanupExpiredConversationStates } from '@/lib/core';

/**
 * Cron job: cleanup expired conversation state rows.
 * Runs every 15 minutes to keep table size bounded.
 */
export const cleanupConversationState = inngest.createFunction(
  {
    id: 'cleanup-conversation-state',
    name: 'Cleanup Conversation State',
    retries: 1,
  },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    const deleted = await step.run('delete-expired-conversation-state', async () => {
      return cleanupExpiredConversationStates();
    });

    return { deleted };
  }
);

export const maintenanceFunctions = [cleanupConversationState];
