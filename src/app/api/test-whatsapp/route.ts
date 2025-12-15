// ===========================================
// WhatsApp API Test Route
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { testSendMessage, verifyWhatsAppConfig, testRichMessage } from '@/lib/test-whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint for WhatsApp API
 * 
 * Usage:
 * GET /api/test-whatsapp?action=config
 * GET /api/test-whatsapp?action=send&phone=YOUR_PHONE_NUMBER
 * GET /api/test-whatsapp?action=rich&phone=YOUR_PHONE_NUMBER
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const phone = searchParams.get('phone');

  try {
    // Verify configuration
    if (action === 'config') {
      const config = verifyWhatsAppConfig();
      return NextResponse.json({
        success: true,
        config,
        message: 'Configuration check complete'
      });
    }

    // Test simple message
    if (action === 'send') {
      if (!phone) {
        return NextResponse.json({
          success: false,
          error: 'Phone number required. Use ?action=send&phone=YOUR_NUMBER'
        }, { status: 400 });
      }

      const result = await testSendMessage(phone);
      return NextResponse.json(result);
    }

    // Test rich formatted message
    if (action === 'rich') {
      if (!phone) {
        return NextResponse.json({
          success: false,
          error: 'Phone number required. Use ?action=rich&phone=YOUR_NUMBER'
        }, { status: 400 });
      }

      const result = await testRichMessage(phone);
      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        message: result.success ? 'Rich message sent!' : 'Failed to send rich message'
      });
    }

    // Default: Show available actions
    return NextResponse.json({
      success: true,
      message: 'WhatsApp API Test Endpoint',
      availableActions: [
        'config - Check WhatsApp configuration',
        'send - Send a test message (requires phone parameter)',
        'rich - Send a rich formatted message (requires phone parameter)'
      ],
      examples: [
        '/api/test-whatsapp?action=config',
        '/api/test-whatsapp?action=send&phone=4367612345678',
        '/api/test-whatsapp?action=rich&phone=4367612345678'
      ],
      note: 'Phone number should include country code (e.g., 4367612345678 for Austria)'
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
