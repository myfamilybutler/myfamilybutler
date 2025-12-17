// ===========================================
// Inngest Client Configuration
// ===========================================
import { Inngest } from 'inngest';

// Create the Inngest client
export const inngest = new Inngest({
  id: 'myfamilybutler',
  name: 'MyFamilyButler',
});

// Event types for type safety
export type ReminderDueEvent = {
  name: 'reminder/due';
  data: {
    reminderId: string;
    userId: string;
    message: string;
  };
};

export type Events = {
  'reminder/due': ReminderDueEvent;
};
