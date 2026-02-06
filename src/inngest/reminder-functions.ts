/**
 * Inngest Reminder Functions with Race Condition Protection
 * 
 * Implements proper locking to prevent duplicate reminder sends.
 * Integrates with dead letter queue for failed jobs.
 */

import { inngest } from '@/lib/inngest';
import {
  claimDueReminders,
  completeClaimedReminder,
  claimReminderById,
} from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/channels/telegram/send';
import { sendWhatsAppMessage } from '@/lib/channels/whatsapp/send';
import { addToDeadLetterQueue } from '@/lib/core/dead-letter-queue';
import { randomUUID } from 'crypto';

/**
 * Cron job: Check for due reminders every 5 minutes
 * Implements row-level locking to prevent duplicate sends
 */
export const checkDueReminders = inngest.createFunction(
  { 
    id: 'check-due-reminders', 
    name: 'Check Due Reminders',
    retries: 3,
  },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    const workerId = `inngest-check-${randomUUID()}`;

    // Step 1: Get all pending reminders that are due with locking
    const dueReminders = await step.run('get-due-reminders', async () => {
      const reminders = await claimDueReminders(workerId, 100);
      console.log(`[Inngest] Claimed ${reminders.length} due reminders`);
      return reminders;
    });

    if (dueReminders.length === 0) {
      return { processed: 0 };
    }

    // Step 2: Process each reminder
    let successCount = 0;
    let failCount = 0;

    for (const reminder of dueReminders) {
      const result = await step.run(`send-reminder-${reminder.id}`, async () => {
        try {
          const user = reminder.users;
          
          if (!user) {
            console.error(`[Inngest] No user found for reminder ${reminder.id}`);
            await completeClaimedReminder(reminder.id, reminder.claim_token, 'failed');
            return { success: false, error: 'No user found' };
          }

          // Format the reminder message
          const messageText = `⏰ Erinnerung!\n\n📋 ${reminder.message}`;

          // Try Telegram first, then WhatsApp
          let sent = false;

          if (user.telegram_chat_id) {
            const result = await sendTelegramMessage(
              parseInt(user.telegram_chat_id),
              messageText
            );
            sent = result.success;
            if (sent) {
              console.log(`[Inngest] Sent reminder via Telegram to ${user.telegram_chat_id}`);
            }
          }

          if (!sent && user.phone_number) {
            const result = await sendWhatsAppMessage(user.phone_number, messageText);
            sent = result.success;
            if (sent) {
              console.log(`[Inngest] Sent reminder via WhatsApp to ${user.phone_number}`);
            }
          }

          if (sent) {
            await completeClaimedReminder(reminder.id, reminder.claim_token, 'sent');
            return { success: true };
          } else {
            console.error(`[Inngest] Failed to send reminder ${reminder.id} - no delivery channel`);
            await completeClaimedReminder(reminder.id, reminder.claim_token, 'failed');
            return { success: false, error: 'No delivery channel available' };
          }
        } catch (error) {
          console.error(`[Inngest] Error processing reminder ${reminder.id}:`, error);
          
          // Add to dead letter queue for manual inspection
          await addToDeadLetterQueue(
            'reminder_send',
            { reminderId: reminder.id, userId: reminder.user_id },
            error as Error,
            0,
            3
          );
          
          await completeClaimedReminder(reminder.id, reminder.claim_token, 'failed');
          return { success: false, error: String(error) };
        }
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return {
      processed: dueReminders.length,
      success: successCount,
      failed: failCount,
    };
  }
);

/**
 * Event-driven: Send a specific reminder immediately
 * Triggered by inngest.send({ name: 'reminder/due', data: { reminderId, ... } })
 */
export const sendReminder = inngest.createFunction(
  { 
    id: 'send-reminder', 
    name: 'Send Reminder',
    retries: 3,
  },
  { event: 'reminder/due' },
  async ({ event, step }) => {
    const { reminderId } = event.data;
    const workerId = `inngest-send-${randomUUID()}`;

    const result = await step.run('send-reminder', async () => {
      let claimedReminderId: string | null = null;
      let claimedToken: string | null = null;

      try {
        const reminder = await claimReminderById(reminderId, workerId);

        if (!reminder) {
          console.log(`[Inngest] Reminder ${reminderId} already claimed/processed, skipping`);
          return { success: true, skipped: true };
        }

        const user = reminder.users;
        claimedReminderId = reminder.id;
        claimedToken = reminder.claim_token;

        if (!user) {
          await completeClaimedReminder(reminder.id, reminder.claim_token, 'failed');
          return { success: false, error: 'User not found' };
        }

        const messageText = `⏰ Erinnerung!\n\n📋 ${reminder.message}`;

        // Try Telegram first, then WhatsApp
        let sent = false;

        if (user.telegram_chat_id) {
          const result = await sendTelegramMessage(
            parseInt(user.telegram_chat_id),
            messageText
          );
          sent = result.success;
        }

        if (!sent && user.phone_number) {
          const result = await sendWhatsAppMessage(user.phone_number, messageText);
          sent = result.success;
        }

        if (sent) {
          await completeClaimedReminder(reminder.id, reminder.claim_token, 'sent');
          return { success: true };
        } else {
          await completeClaimedReminder(reminder.id, reminder.claim_token, 'failed');
          return { success: false, error: 'Failed to send' };
        }
      } catch (error) {
        console.error(`[Inngest] Error in send-reminder for ${reminderId}:`, error);

        if (claimedReminderId && claimedToken) {
          await completeClaimedReminder(claimedReminderId, claimedToken, 'failed');
        }
        
        // Add to dead letter queue
        await addToDeadLetterQueue(
          'reminder_send',
          { reminderId, eventData: event.data },
          error as Error,
          0,
          3
        );
        
        throw error; // Re-throw to trigger retry
      }
    });

    return result;
  }
);

// Export all functions for the Inngest handler
export const functions = [checkDueReminders, sendReminder];
