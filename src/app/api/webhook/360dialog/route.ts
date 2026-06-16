// ===========================================
// 360dialog WhatsApp Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { enqueueMessage } from '@/inngest/process-message';
import { gateway } from '@/lib/core';
import { dialog360Adapter } from '@/lib/channels/360dialog/adapter';
import { log, logError, logWarn } from '@/lib/utils/logger';

let d360WebhookFallbackWarningLogged = false;

function secureCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

let dialog360AdapterRegistered = false;
function ensure360DialogAdapter() {
  if (!dialog360AdapterRegistered) {
    gateway.registerAdapter(dialog360Adapter);
    dialog360AdapterRegistered = true;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isProviderEnabled('360dialog')) {
    log.info('[360dialog] Provider disabled, ignoring webhook');
    return NextResponse.json({ success: true });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('d360-api-key');

  const webhookSecret = process.env.D360_WEBHOOK_SECRET;
  const fallbackKey = process.env.D360_API_KEY;
  const expectedSecret = webhookSecret || fallbackKey;

  if (!webhookSecret && fallbackKey && !d360WebhookFallbackWarningLogged) {
    logWarn(
      '[360dialog Webhook] D360_WEBHOOK_SECRET is not set; falling back to D360_API_KEY. Configure a dedicated webhook secret.'
    );
    d360WebhookFallbackWarningLogged = true;
  }

  if (!signature || !expectedSecret || !secureCompare(signature, expectedSecret)) {
    logError('[360dialog Webhook] Invalid d360-api-key signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  try {
    const body = JSON.parse(rawBody);

    ensure360DialogAdapter();

    const queued = await enqueueMessage('360dialog', body, rawBody, signature);
    if (!queued.queued) {
      await gateway.processMessage('360dialog', body, rawBody, signature);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('[360dialog] Webhook error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}
