// ===========================================
// 360dialog WhatsApp Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { enqueueMessage } from '@/inngest/process-message';
import { gateway } from '@/lib/core';
import { dialog360Adapter } from '@/lib/channels/360dialog/adapter';

let dialog360AdapterRegistered = false;
function ensure360DialogAdapter() {
  if (!dialog360AdapterRegistered) {
    gateway.registerAdapter(dialog360Adapter);
    dialog360AdapterRegistered = true;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isProviderEnabled('360dialog')) {
    console.log('[360dialog] Provider disabled, ignoring webhook');
    return NextResponse.json({ success: true });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('d360-api-key');

  try {
    const body = JSON.parse(rawBody);

    ensure360DialogAdapter();

    const queued = await enqueueMessage('360dialog', body, rawBody, signature);
    if (!queued.queued) {
      await gateway.processMessage('360dialog', body, rawBody, signature);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[360dialog] Webhook error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}
