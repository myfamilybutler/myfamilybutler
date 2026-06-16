// ===========================================
// Meta WhatsApp Cloud API Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import type { MetaWebhookBody } from '@/types';
import { gateway } from '@/lib/core';
import { whatsappAdapter } from '@/lib/channels/whatsapp/adapter';
import { enqueueMessage } from '@/inngest/process-message';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { log, logError } from '@/lib/utils/logger';

let whatsappAdapterRegistered = false;
function ensureWhatsAppAdapter() {
  if (!whatsappAdapterRegistered) {
    gateway.registerAdapter(whatsappAdapter);
    whatsappAdapterRegistered = true;
  }
}

/**
 * GET - Meta Webhook Verification
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  log.info('[Webhook] GET verification request:', { mode, token: token?.slice(0, 10) + '...', challenge });

  if (mode === 'subscribe' && token === verifyToken) {
    log.info('[Webhook] Verification successful!');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  log.info('[Webhook] Verification failed - token mismatch');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Handle incoming Meta WhatsApp webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Provider on/off switch - return 200 but don't process if disabled
  if (!isProviderEnabled('whatsapp_business')) {
    log.info('[WhatsApp Webhook] Provider disabled, ignoring webhook');
    return NextResponse.json({ success: true });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  try {
    const body: MetaWebhookBody = JSON.parse(rawBody);

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ success: true });
    }

    ensureWhatsAppAdapter();

    const queued = await enqueueMessage('whatsapp', body, rawBody, signature);
    if (!queued.queued) {
      await gateway.processMessage('whatsapp', body, rawBody, signature);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('[Webhook] POST error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}
