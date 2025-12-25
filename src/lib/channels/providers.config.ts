// ===========================================
// Messaging Provider Configuration
// ===========================================
// Simple on/off switches for messaging providers
// Toggle via environment variables during testing vs production

export type ProviderType = 'whatsapp_business' | 'telegram' | 'wasender';

/**
 * Check if a specific provider is enabled
 * Used in webhook routes to early-exit when provider is disabled
 */
export function isProviderEnabled(provider: ProviderType): boolean {
  switch (provider) {
    case 'telegram':
      return process.env.PROVIDER_TELEGRAM_ENABLED === 'true';
    case 'whatsapp_business':
      return process.env.PROVIDER_WHATSAPP_ENABLED === 'true';
    case 'wasender':
      return process.env.PROVIDER_WASENDER_ENABLED === 'true';
    default:
      return false;
  }
}
