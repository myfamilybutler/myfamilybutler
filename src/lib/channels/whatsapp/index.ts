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

export { whatsappAdapter } from './adapter';
