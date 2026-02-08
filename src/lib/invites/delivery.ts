import { isProviderEnabled } from '@/lib/channels/providers.config';
import { sendTelegramMessageWithUrlButton } from '@/lib/channels/telegram/send';
import { sendMessageWithUrlButton } from '@/lib/channels/whatsapp/send';
import { findUserByIdentifier, normalizePhone } from '@/lib/supabase';
import { log } from '@/lib/utils/logger';

interface ChannelDeliveryResult {
  attempted: boolean;
  success: boolean;
  error?: string;
}

export interface PhoneInviteDeliveryResult {
  normalizedPhone: string | null;
  whatsapp: ChannelDeliveryResult;
  telegram: ChannelDeliveryResult;
}

function buildInviteMessage(inviterName?: string, householdName?: string): string {
  const inviterLabel = inviterName?.trim() || 'A family member';
  const householdLabel = householdName?.trim() || 'a family';
  return `${inviterLabel} invited you to join ${householdLabel} on MyFamilyButler.\n\nReview the invite and choose Approve or Decline.`;
}

export async function sendPhoneInviteMessages(opts: {
  phoneNumber: string;
  joinLink: string;
  inviterName?: string;
  householdName?: string;
}): Promise<PhoneInviteDeliveryResult> {
  const normalizedPhone = normalizePhone(opts.phoneNumber);

  if (!normalizedPhone) {
    return {
      normalizedPhone: null,
      whatsapp: { attempted: false, success: false, error: 'Invalid phone number' },
      telegram: { attempted: false, success: false, error: 'Invalid phone number' },
    };
  }

  const inviteText = buildInviteMessage(opts.inviterName, opts.householdName);
  const result: PhoneInviteDeliveryResult = {
    normalizedPhone,
    whatsapp: { attempted: false, success: false },
    telegram: { attempted: false, success: false },
  };

  if (isProviderEnabled('whatsapp_business')) {
    result.whatsapp.attempted = true;
    const wa = await sendMessageWithUrlButton(normalizedPhone, inviteText, {
      title: 'Review Invite',
      url: opts.joinLink,
    });
    result.whatsapp.success = wa.success;
    result.whatsapp.error = wa.error;
  }

  const userByPhone = await findUserByIdentifier({ phone: normalizedPhone });
  const telegramChatId = userByPhone?.telegram_chat_id;

  if (telegramChatId && isProviderEnabled('telegram')) {
    result.telegram.attempted = true;
    const tg = await sendTelegramMessageWithUrlButton(
      telegramChatId,
      inviteText,
      { text: 'Review Invite', url: opts.joinLink }
    );
    result.telegram.success = tg.success;
    result.telegram.error = tg.error;
  } else if (!telegramChatId) {
    result.telegram.error = 'No linked Telegram account for this phone number';
  }

  log.info('[Invite Delivery] Phone invite channels:', {
    phone: normalizedPhone,
    whatsapp: result.whatsapp,
    telegram: result.telegram,
  });

  return result;
}
