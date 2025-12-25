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

// WhatsApp Media Processing
export {
  processImageMessage,
  processVoiceMessage,
} from './whatsapp-media';

// Telegram Media Processing
export {
  processTelegramVoiceMessage,
} from './telegram-media';

// Base Media Handler (shared utilities)
export {
  handleBrainResult,
  formatEventConfirmation,
  formatEventsList,
  MEDIA_CONFIG,
  MESSAGES,
  type MediaContext,
  type MediaResult,
  type MessageSender,
} from './base-media-handler';

// ===========================================
// Provider On/Off Switching
// ===========================================

export {
  type ProviderType,
  isProviderEnabled,
} from './providers.config';
