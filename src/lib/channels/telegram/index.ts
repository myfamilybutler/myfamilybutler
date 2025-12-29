/**
 * Telegram Channel Module
 * 
 * Telegram Bot API integration for testing.
 */

// Send functions
export {
  sendTelegramMessage,
  sendTelegramMessageWithUrlButton,
  requestPhoneNumber,
  removeKeyboard,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  downloadTelegramFile,
  type TelegramUrlButton,
} from './send';

// Media processing
export {
  processTelegramVoiceMessage,
} from './media';
