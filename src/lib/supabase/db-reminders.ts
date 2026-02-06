/**
 * Reminder Database Operations
 */
import type { Reminder, User } from '@/types';
import { getAdminClient } from './client';

export interface ClaimedReminder extends Reminder {
  users: User;
  claim_token: string;
}

/**
 * Create a reminder
 */
export async function createReminder(
  userId: string,
  message: string,
  remindAt: Date
): Promise<Reminder | null> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('reminders')
    .insert({
      user_id: userId,
      message,
      remind_at: remindAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating reminder:', error);
    return null;
  }
  
  return data as Reminder;
}

/**
 * Get all pending reminders that are due
 */
export async function getPendingReminders(): Promise<(Reminder & { users: User })[]> {
  const admin = getAdminClient();
  
  const { data, error } = await admin
    .from('reminders')
    .select('*, users(*)')
    .eq('status', 'pending')
    .lte('remind_at', new Date().toISOString());
  
  if (error) {
    console.error('Error fetching pending reminders:', error);
    return [];
  }
  
  return (data ?? []) as (Reminder & { users: User })[];
}

/**
 * Update reminder status
 */
export async function updateReminderStatus(
  reminderId: string,
  status: 'sent' | 'failed' | 'cancelled'
): Promise<boolean> {
  const admin = getAdminClient();
  
  const { error } = await admin
    .from('reminders')
    .update({ status })
    .eq('id', reminderId);
  
  if (error) {
    console.error('Error updating reminder status:', error);
    return false;
  }
  
  return true;
}

/**
 * Atomically claims due reminders for processing.
 */
export async function claimDueReminders(
  workerId: string,
  limitCount: number = 100
): Promise<ClaimedReminder[]> {
  const admin = getAdminClient();

  const { data, error } = await admin.rpc('claim_due_reminders', {
    p_worker_id: workerId,
    p_limit_count: limitCount,
  });

  if (error) {
    console.error('Error claiming due reminders:', error);
    return [];
  }

  return (data ?? []) as ClaimedReminder[];
}

/**
 * Complete a claimed reminder.
 * Only the worker with matching claim token can transition the reminder.
 */
export async function completeClaimedReminder(
  reminderId: string,
  claimToken: string,
  status: 'sent' | 'failed'
): Promise<boolean> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('reminders')
    .update({
      status,
      claimed_at: null,
      claim_token: null,
      claim_worker_id: null,
    })
    .eq('id', reminderId)
    .eq('status', 'pending')
    .eq('claim_token', claimToken)
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error completing claimed reminder:', error);
    return false;
  }

  return true;
}

/**
 * Atomically claim one specific reminder by ID.
 */
export async function claimReminderById(
  reminderId: string,
  workerId: string
): Promise<ClaimedReminder | null> {
  const admin = getAdminClient();

  const { data, error } = await admin.rpc('claim_single_reminder', {
    p_reminder_id: reminderId,
    p_worker_id: workerId,
  });

  if (error) {
    console.error('Error claiming reminder by ID:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as ClaimedReminder;
}
