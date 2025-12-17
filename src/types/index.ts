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
  email?: string;
  household_id?: string;
  display_name?: string;
  is_admin: boolean;
  supabase_user_id?: string;
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

export interface FamilyInvite {
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
  end_time?: string;
  is_all_day: boolean;
  family_member?: string;
  location?: string;
  description?: string;
  source_message_id?: string;
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
}

export interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
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
