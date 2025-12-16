// ===========================================
// WhatsApp Testing Utilities
// ===========================================
// Use this file to test WhatsApp API integration

import { sendWhatsAppMessage } from './whatsapp';

/**
 * Test sending a simple text message
 * Usage: Call this function from an API route or Next.js action
 */
export async function testSendMessage(phoneNumber: string) {
  console.log('🧪 Testing WhatsApp message send...');
  console.log(`📱 Target: ${phoneNumber}`);
  
  const testMessage = `🤖 *MyFamilyButler Test*\n\nHello! This is a test message from your Family Butler.\n\n✅ If you receive this, the integration is working!\n\n_Timestamp: ${new Date().toISOString()}_`;
  
  const result = await sendWhatsAppMessage(phoneNumber, testMessage);
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
    console.log('📬 Message ID:', result.messageId);
    return {
      success: true,
      messageId: result.messageId,
      message: 'Test message sent successfully'
    };
  } else {
    console.error('❌ Failed to send message:', result.error);
    return {
      success: false,
      error: result.error,
      message: 'Failed to send test message'
    };
  }
}

/**
 * Verify WaSenderAPI credentials
 */
export function verifyWhatsAppConfig() {
  const config = {
    provider: 'WaSenderAPI',
    hasApiKey: !!process.env.WASENDER_API_KEY,
    hasApiUrl: !!process.env.WASENDER_API_URL,
    apiUrl: process.env.WASENDER_API_URL || 'https://www.wasenderapi.com/api (default)',
    // Legacy Meta API (for reference)
    legacyMeta: {
      hasToken: !!process.env.WHATSAPP_API_TOKEN,
      hasPhoneId: !!process.env.WHATSAPP_PHONE_ID,
    },
  };
  
  console.log('🔍 WaSenderAPI Configuration Check:');
  console.log('  API Key:', config.hasApiKey ? '✅ Set' : '❌ Missing');
  console.log('  API URL:', config.apiUrl);
  
  const isValid = config.hasApiKey;
  console.log('\n', isValid ? '✅ WaSenderAPI configured!' : '❌ Missing API key');
  
  return config;
}

/**
 * Example: Rich formatted message with emojis
 */
export async function testRichMessage(phoneNumber: string) {
  const message = `
🏠 *MyFamilyButler* 🤖

Welcome to your personal family assistant!

📋 *What I can do:*
• ✅ Create reminders
• 📅 Schedule tasks
• 💬 Natural conversation
• 🔔 Smart notifications

Try saying: "Remind me to buy milk tomorrow at 3pm"

_Powered by AI • ${new Date().toLocaleDateString('de-AT')}_
  `.trim();
  
  return sendWhatsAppMessage(phoneNumber, message);
}
