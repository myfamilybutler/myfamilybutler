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

export type BroadcastRequestedEvent = {
  name: 'admin/broadcast.requested';
  data: {
    subject?: string;
    message: string;
    channels?: string[];
    channel?: string;
    testOnly?: boolean;
    requestedBy: string;
    requester: {
      phone_number?: string | null;
      telegram_chat_id?: string | null;
      onboarding_source?: string | null;
    };
  };
};

export type Events = {
  'reminder/due': ReminderDueEvent;
  'admin/broadcast.requested': BroadcastRequestedEvent;
};
