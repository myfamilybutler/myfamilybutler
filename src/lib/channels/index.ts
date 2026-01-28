/**
 * Channels Module - Main Entry Point
 * 
 * Re-exports messaging channel integrations.
 * All channels now follow consistent folder structure.
 */

// ===========================================
// Base Utilities (Shared)
// ===========================================

export {
  // Commands
  processCommand,
  detectCommand,
  handleDashboard,
  handleStart,
  handleHelp,
  handleNewEvent,
  COMMAND_MESSAGES,
  type CommandContext,
  type CommandResult,
  // Media handling
  handleBrainResult,
  formatEventConfirmation,
  formatEventsList,
  MEDIA_CONFIG,
  MESSAGES,
  type MediaContext,
  type MediaResult,
  type MessageSender,
} from './base';

// ===========================================
// WhatsApp (Meta Cloud API - Production)
// ===========================================

export {
  sendWhatsAppMessage,
  markMessageAsRead,
  sendInteractiveMessage,
  processImageMessage,
  processVoiceMessage,
  handleCommand,
  processIntents,
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
  processTelegramVoiceMessage,
} from './telegram/index';

// ===========================================
// 360dialog (Testing)
// ===========================================

export {
  send360DialogMessage,
  send360DialogInteractiveMessage,
  mark360DialogMessageAsRead,
  download360DialogMedia,
  process360DialogImage,
  process360DialogVoice,
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
