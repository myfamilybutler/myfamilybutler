// ===========================================
// MyFamilyButler - Global TypeScript Interfaces
// ===========================================

// Database Types
export interface User {
  id: string;
  phone_number: string;
  subscription_status: 'free' | 'trial' | 'active' | 'cancelled' | 'expired';
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
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

// WhatsApp Webhook Types
export interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'button' | 'reaction';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
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
