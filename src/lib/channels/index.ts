/**
 * Channels Module - Main Entry Point
 * 
 * Re-exports messaging channel integrations.
 */

// Telegram Bot API
export { 
  sendTelegramMessage, 
  requestPhoneNumber, 
  removeKeyboard,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  downloadTelegramFile,
} from './telegram';

// WhatsApp Cloud API
export { 
  sendWhatsAppMessage, 
  markMessageAsRead 
} from './whatsapp';

// Unified Message Processor
export { 
  processIncomingMessage,
  handleTelegramPhoneRequest,
  handleTelegramPhoneReceived,
  type ProcessMessageInput,
} from './message-processor';
