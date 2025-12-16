// ===========================================
// MyFamilyButler - Global TypeScript Interfaces
// ===========================================

// ===========================================
// Database Types
// ===========================================

export interface Household {
  id: string;
  name?: string;
  created_at: string;
}

export interface User {
  id: string;
  phone_number: string;
  household_id?: string;
  display_name?: string;
  is_admin: boolean;
  firebase_uid?: string;
  onboarding_completed: boolean;
  subscription_status: 'free' | 'trial' | 'active' | 'cancelled' | 'expired';
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  household_id: string;
  name: string;
  created_at: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  phone_number: string;
  invited_by?: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: 'text' | 'image' | 'voice';
  whatsapp_message_id?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  message: string;
  remind_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
}

export interface Event {
  id: string;
  household_id: string;
  created_by?: string;
  title: string;
  event_date: string;
  event_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
  source_message_id?: string;
  created_at: string;
}

// ===========================================
// WaSenderAPI Webhook Types
// ===========================================

export interface WaSenderWebhookBody {
  event: 'messages.received' | 'messages.upsert' | 'message.sent' | 'message-receipt.update' | 'session.status';
  sessionId: string;
  data: WaSenderWebhookData;
}

export interface WaSenderWebhookData {
  messages?: WaSenderMessage;
  key?: WaSenderMessageKey;
  messageBody?: string;
}

export interface WaSenderMessage {
  key: WaSenderMessageKey;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      caption?: string;
      mimetype?: string;
      url?: string;
    };
    audioMessage?: {
      mimetype?: string;
      url?: string;
    };
    documentMessage?: {
      fileName?: string;
      mimetype?: string;
      url?: string;
    };
    videoMessage?: {
      caption?: string;
      mimetype?: string;
      url?: string;
    };
  };
  messageTimestamp?: number | string;
  pushName?: string;
}

export interface WaSenderMessageKey {
  remoteJid: string;  // Format: "1234567890@s.whatsapp.net"
  fromMe: boolean;
  id: string;
}

// OpenAI Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
