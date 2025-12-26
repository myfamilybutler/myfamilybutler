/**
 * Telegram Channel Module
 * 
 * Telegram Bot API integration for testing.
 */

// Send functions
export {
  sendTelegramMessage,
  requestPhoneNumber,
  removeKeyboard,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  downloadTelegramFile,
} from './send';

// Media processing
export {
  processTelegramVoiceMessage,
} from './media';
