import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { logError } from '@/lib/utils/logger';
import { checkRateLimit } from '@/lib/core/rate-limit';
import { inngest } from '@/lib/inngest';

// Keep the route timeout conservative; the actual send work now runs in Inngest.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const session = await validateSession();
    const admin = getAdminClient();

    const { data: requester, error: requesterError } = await admin
      .from('users')
      .select('is_admin, phone_number, telegram_chat_id, onboarding_source')
      .eq('id', session.userId)
      .single();

    if (requesterError || !requester?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Rate limiting (preserved from the original route)
    const rateKey = `broadcast:${session.userId}`;
    const allowed = await checkRateLimit(rateKey, 15 * 60 * 1000, 5);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many broadcasts. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Parse request body
    const body = await req.json();
    const {
      message,
      channel = 'all',
      testOnly = false,
      subject,
    } = body;

    // 4. Enqueue the background broadcast job
    await inngest.send({
      name: 'admin/broadcast.requested',
      data: {
        subject,
        message,
        channels: channel ? [channel] : undefined,
        channel,
        testOnly,
        requestedBy: session.userId,
        requester: {
          phone_number: requester.phone_number,
          telegram_chat_id: requester.telegram_chat_id,
          onboarding_source: requester.onboarding_source,
        },
      },
    });

    // 5. Return immediately while Inngest handles delivery
    return NextResponse.json(
      { accepted: true, message: 'Broadcast queued' },
      { status: 202 }
    );
  } catch (error) {
    logError('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
