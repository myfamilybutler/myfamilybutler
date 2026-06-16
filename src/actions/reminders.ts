'use server';

import { getAdminClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logError } from '@/lib/utils/logger';

// Schema for Reminder creation
const CreateReminderSchema = z.object({
  userId: z.string().uuid(),
  message: z.string().min(1, "Message is required"),
  remindAt: z.string().datetime(),
});

export type ServerActionState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createReminderAction(
  prevState: ServerActionState,
  formData: FormData
): Promise<ServerActionState> {
  const admin = getAdminClient();
  
  // Extract data from FormData
  const rawData = {
    userId: formData.get('userId'),
    message: formData.get('message'),
    remindAt: formData.get('remindAt'),
  };

  // Validate
  const validatedFields = CreateReminderSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { userId, message, remindAt } = validatedFields.data;

  try {
    const { error } = await admin
      .from('reminders')
      .insert({
        user_id: userId,
        message,
        remind_at: remindAt,
        status: 'pending',
      });

    if (error) {
      logError('Database error:', error);
      return { success: false, message: 'Failed to create reminder' };
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Reminder created successfully' };
  } catch (error) {
    logError('Server action error:', error);
    return { success: false, message: 'Internal server error' };
  }
}
