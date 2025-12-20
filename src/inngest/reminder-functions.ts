// ===========================================
// Inngest Reminder Functions
// ===========================================
import { inngest } from '@/lib/inngest';
import { getPendingReminders, updateReminderStatus, getAdminClient } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/channels/telegram';
import { sendWhatsAppMessage } from '@/lib/channels/whatsapp';

/**
 * Cron job: Check for due reminders every 5 minutes
 * Runs at :00, :05, :10, etc. of every hour
 */
export const checkDueReminders = inngest.createFunction(
  { id: 'check-due-reminders', name: 'Check Due Reminders' },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    // Step 1: Get all pending reminders that are due
    const dueReminders = await step.run('get-due-reminders', async () => {
      const reminders = await getPendingReminders();
      console.log(`[Inngest] Found ${reminders.length} due reminders`);
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
            await updateReminderStatus(reminder.id, 'failed');
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
            await updateReminderStatus(reminder.id, 'sent');
            return { success: true };
          } else {
            console.error(`[Inngest] Failed to send reminder ${reminder.id} - no delivery channel`);
            await updateReminderStatus(reminder.id, 'failed');
            return { success: false, error: 'No delivery channel available' };
          }
        } catch (error) {
          console.error(`[Inngest] Error processing reminder ${reminder.id}:`, error);
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
  { id: 'send-reminder', name: 'Send Reminder' },
  { event: 'reminder/due' },
  async ({ event, step }) => {
    const { reminderId } = event.data;

    const result = await step.run('send-reminder', async () => {
      const admin = getAdminClient();

      // Get reminder with user data
      const { data: reminder, error } = await admin
        .from('reminders')
        .select('*, users(*)')
        .eq('id', reminderId)
        .single();

      if (error || !reminder) {
        console.error(`[Inngest] Reminder ${reminderId} not found`);
        return { success: false, error: 'Reminder not found' };
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
    });

    return result;
  }
);

// Export all functions for the Inngest handler
export const functions = [checkDueReminders, sendReminder];
