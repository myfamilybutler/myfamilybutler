/**
 * Channels Module - Main Entry Point
 * 
 * Re-exports messaging channel integrations.
 * All channels now follow consistent folder structure.
 */

// ===========================================
// WhatsApp (Meta Cloud API - Production)
// ===========================================

export {
  sendWhatsAppMessage,
  markMessageAsRead,
  sendInteractiveMessage,
  sendMessageWithUrlButton,
  whatsappAdapter,
  type QuickReplyButton,
} from './whatsapp/index';

// ===========================================
// Telegram (Testing)
// ===========================================

export {
  sendTelegramMessage,
  requestPhoneNumber,
  removeKeyboard,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  downloadTelegramFile,
  telegramAdapter,
} from './telegram/index';

// ===========================================
// 360dialog (Testing)
// ===========================================

export {
  send360DialogMessage,
  send360DialogInteractiveMessage,
  mark360DialogMessageAsRead,
  download360DialogMedia,
  send360DialogMessageWithUrlButton,
  dialog360Adapter,
} from './360dialog';

// ===========================================
// Telegram Onboarding
// ===========================================

export { handleTelegramPhoneReceived } from './telegram/onboarding';

// ===========================================
// Provider On/Off Switching
// ===========================================

export {
  type ProviderType,
  isProviderEnabled,
} from './providers.config';
