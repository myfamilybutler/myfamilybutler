/**
 * Inngest Reminder Functions with Race Condition Protection
 * 
 * Implements proper locking to prevent duplicate reminder sends.
 * Integrates with dead letter queue for failed jobs.
 */

import { inngest } from '@/lib/inngest';
import { getPendingReminders, updateReminderStatus, getAdminClient } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/channels/telegram/send';
import { sendWhatsAppMessage } from '@/lib/channels/whatsapp/send';
import { addToDeadLetterQueue } from '@/lib/core/dead-letter-queue';

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
    // Step 1: Get all pending reminders that are due with locking
    const dueReminders = await step.run('get-due-reminders', async () => {
      const admin = getAdminClient();
      
      // Use RPC for atomic fetch-and-lock operation
      const { data: reminders, error } = await admin.rpc('get_and_lock_due_reminders', {
        limit_count: 100,
      });
      
      if (error) {
        console.error('[Inngest] Error fetching reminders:', error);
        // Fallback to regular fetch
        return await getPendingReminders();
      }
      
      console.log(`[Inngest] Found ${reminders?.length || 0} due reminders`);
      return reminders || [];
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
            await updateReminderStatus(reminder.id, 'failed');
            return { success: false, error: 'No user found' };
          }

          // Double-check status before sending (race condition protection)
          const admin = getAdminClient();
          const { data: currentReminder } = await admin
            .from('reminders')
            .select('status')
            .eq('id', reminder.id)
            .single();
            
          if (currentReminder?.status !== 'pending') {
            console.log(`[Inngest] Reminder ${reminder.id} already processed, skipping`);
            return { success: true, skipped: true };
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
            await updateReminderStatus(reminder.id, 'sent');
            return { success: true };
          } else {
            console.error(`[Inngest] Failed to send reminder ${reminder.id} - no delivery channel`);
            await updateReminderStatus(reminder.id, 'failed');
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
          
          await updateReminderStatus(reminder.id, 'failed');
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

    const result = await step.run('send-reminder', async () => {
      try {
        const admin = getAdminClient();

        // Get reminder with user data and lock it
        const { data: reminder, error } = await admin
          .from('reminders')
          .select('*, users(*)')
          .eq('id', reminderId)
          .single();

        if (error || !reminder) {
          console.error(`[Inngest] Reminder ${reminderId} not found`);
          return { success: false, error: 'Reminder not found' };
        }

        // Check if already processed
        if (reminder.status !== 'pending') {
          console.log(`[Inngest] Reminder ${reminderId} already ${reminder.status}, skipping`);
          return { success: true, skipped: true };
        }

        const user = reminder.users;
        if (!user) {
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
          await updateReminderStatus(reminderId, 'sent');
          return { success: true };
        } else {
          await updateReminderStatus(reminderId, 'failed');
          return { success: false, error: 'Failed to send' };
        }
      } catch (error) {
        console.error(`[Inngest] Error in send-reminder for ${reminderId}:`, error);
        
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
