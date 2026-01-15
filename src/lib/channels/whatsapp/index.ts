/**
 * WhatsApp Channel Module (Meta Cloud API)
 * 
 * Production WhatsApp integration via Meta Cloud API.
 */

// Send functions
export {
  sendWhatsAppMessage,
  markMessageAsRead,
  sendInteractiveMessage,
  sendMessageWithUrlButton,
  type QuickReplyButton,
  type UrlButton,
} from './send';

// Media processing
export {
  processImageMessage,
  processVoiceMessage,
  processDocumentMessage,
} from './media';

// Command handlers
export {
  handleCommand,
} from './commands';

// Intent processing
export {
  processIntents,
} from './intents';
