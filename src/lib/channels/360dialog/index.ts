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

// Media processing
export {
  processImage as process360DialogImage,
  processVoice as process360DialogVoice,
  type MediaContext as D360MediaContext,
  type MediaResult as D360MediaResult,
} from './media';
