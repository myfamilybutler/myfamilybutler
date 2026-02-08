// ===========================================
// MyFamilyButler - Global TypeScript Interfaces
// ===========================================

// ===========================================
// Database Types
// ===========================================

export interface Family {
  id: string;
  name?: string;
  created_at: string;
}

export interface User {
  id: string;
  phone_number?: string;
  linked_email?: string;  // Email for desktop magic link login
  email_verified?: boolean;  // Whether linked_email has been verified
  phone_verified?: boolean;  // Whether phone has been verified via messaging channel
  household_id?: string;
  display_name?: string;
  is_admin: boolean;  // Super admin (internal team only)
  is_household_admin: boolean;  // Household owner/admin
  telegram_chat_id?: string;
  whatsapp_verified?: boolean;
  onboarding_modal_shown?: boolean;  // Has user seen the dashboard modal?
  onboarding_source?: 'whatsapp' | 'telegram' | 'invite' | 'email_invite';  // How they first registered
  subscription_status: 'free' | 'trial' | 'active' | 'cancelled' | 'expired';
  stripe_customer_id?: string;
  identity_linked_at?: string;  // When additional identifiers were linked
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  household_id: string;
  name: string;
  created_at: string;
}

export interface FamilyInvite {
  id: string;
  household_id: string;
  phone_number?: string; // Optional for open invites
  email?: string;       // Optional for open invites
  token: string;        // Required for all invites now
  invited_by?: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: 'text' | 'image' | 'voice';
  whatsapp_message_id?: string;
  channel?: 'whatsapp' | 'telegram' | '360dialog';
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  event_id?: string | null;
  message: string;
  remind_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  claimed_at?: string | null;
  claim_token?: string | null;
  claim_worker_id?: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  household_id: string;
  created_by?: string;
  title: string;
  event_date: string;
  end_date?: string;
  event_time?: string;
  end_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
  source_message_id?: string;
  // Google Calendar sync fields
  google_event_id?: string;
  event_fingerprint?: string;
  google_synced_at?: string;
  sync_source?: 'local' | 'google';
  created_at: string;
}

// ===========================================
// Meta WhatsApp Cloud API Webhook Types
// ===========================================

export interface MetaWebhookBody {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string; // WhatsApp Business Account ID
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  value: MetaWebhookValue;
  field: 'messages';
}

export interface MetaWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

export interface MetaContact {
  profile: { name: string };
  wa_id: string; // Phone number without + (e.g., "436601234567")
}

export interface MetaMessage {
  from: string; // Sender's phone number
  id: string; // Message ID for deduplication
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'reaction' | 'location' | 'interactive' | 'button';
  text?: { body: string };
  image?: { caption?: string; mime_type: string; sha256: string; id: string };
  audio?: { mime_type: string; sha256: string; id: string };
  video?: { caption?: string; mime_type: string; sha256: string; id: string };
  document?: { filename: string; mime_type: string; sha256: string; id: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

// ===========================================
// Telegram Bot API Types
// ===========================================

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  document?: TelegramDocument;
  caption?: string;
  contact?: TelegramContact;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

// ===========================================
// Message Channel Type
// ===========================================

export type MessageChannel = 'whatsapp' | 'telegram' | '360dialog';

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

// ===========================================
// AI Types Re-export (for discoverability)
// These are colocated with the AI module but re-exported here
// ===========================================
export type {
  ParsedEvent,
  EventExtractionResult,
  ParsedReminder,
  VoiceProcessingResult,
  InputType,
  UnifiedInput,
  BrainAction,
  BrainResult,
  DraftEvent,
  DraftStatus,
} from '@/lib/ai/types';
