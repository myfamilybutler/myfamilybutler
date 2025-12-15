// ===========================================
// Test OpenAI Directly (No WhatsApp)
// ===========================================
import { generateAIResponse, parseReminderIntent } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Test OpenAI integration without requiring WhatsApp
 * 
 * Usage:
 * GET /api/test-openai - Basic AI chat test
 * GET /api/test-openai?message=YOUR_MESSAGE - Custom message
 * GET /api/test-openai?action=reminder&message=Remind me tomorrow - Test reminder parsing
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const customMessage = searchParams.get('message');

  try {
    // Test reminder parsing
    if (action === 'reminder') {
      const testMessage = customMessage || 'Remind me to buy milk tomorrow at 3pm';
      console.log('🧪 Testing reminder parsing:', testMessage);
      
      const reminderIntent = await parseReminderIntent(testMessage);
      
      return NextResponse.json({
        success: true,
        action: 'reminder_parsing',
        inputMessage: testMessage,
        reminderDetected: !!reminderIntent,
        parsedReminder: reminderIntent,
        message: reminderIntent 
          ? `✅ Reminder detected: "${reminderIntent.task}" on ${reminderIntent.datetime.toISOString()}`
          : '❌ No reminder detected in message'
      });
    }

    // Test basic AI chat
    const testMessage = customMessage || 'Hello! I am testing the AI integration. Can you respond in German?';
    console.log('🧪 Testing OpenAI chat:', testMessage);
    
    const aiResponse = await generateAIResponse([], testMessage);
    
    return NextResponse.json({
      success: true,
      action: 'chat',
      inputMessage: testMessage,
      aiResponse: aiResponse,
      message: '✅ OpenAI integration working!',
      meta: {
        model: 'gpt-4o',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('OpenAI test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '❌ OpenAI test failed'
    }, { status: 500 });
  }
}
