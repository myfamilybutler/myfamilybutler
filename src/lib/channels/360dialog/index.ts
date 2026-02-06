/**
 * 360dialog Channel Module
 * 
 * Complete 360dialog WhatsApp integration for the testing stage.
 */

export {
  send360DialogMessage,
  send360DialogInteractiveMessage,
  send360DialogMessageWithUrlButton,
  mark360DialogMessageAsRead,
  download360DialogMedia,
  type UrlButton as D360UrlButton,
} from './send';

export { dialog360Adapter } from './adapter';
