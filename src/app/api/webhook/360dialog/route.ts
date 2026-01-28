// ===========================================
// 360dialog WhatsApp Webhook Handler
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { isProviderEnabled } from '@/lib/channels/providers.config';
import { enqueueMessage } from '@/inngest/process-message';
import { gateway } from '@/lib/core';
import { whatsappAdapter } from '@/lib/channels/whatsapp/adapter';

interface D360Message {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive';
  text?: { body: string };
  image?: { caption?: string; mime_type: string; id: string };
  audio?: { mime_type: string; id: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

interface D360Contact {
  profile: { name: string };
  wa_id: string;
}

interface D360WebhookBody {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: D360Contact[];
        messages?: D360Message[];
        statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>;
      };
      field: 'messages';
    }>;
  }>;
}

let whatsappAdapterRegistered = false;
function ensureWhatsAppAdapter() {
  if (!whatsappAdapterRegistered) {
    gateway.registerAdapter(whatsappAdapter);
    whatsappAdapterRegistered = true;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isProviderEnabled('360dialog')) {
    console.log('[360dialog] Provider disabled, ignoring webhook');
    return NextResponse.json({ success: true });
  }

  const rawBody = await request.text();

  try {
    const body = JSON.parse(rawBody) as D360WebhookBody;

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages || value.messages.length === 0) {
      return NextResponse.json({ success: true });
    }

    logMessageSummary(value.messages);

    ensureWhatsAppAdapter();

    const signature = request.headers.get('d360-api-key');
    const queued = await enqueueMessage('whatsapp', body, rawBody, signature);
    if (!queued.queued) {
      await gateway.processMessage('whatsapp', body, rawBody, signature);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[360dialog] Webhook error:', error);
    return NextResponse.json({ success: true, error: 'Processing error' });
  }
}

function logMessageSummary(messages: D360Message[]) {
  const summary = messages.map(m => `${m.type}:${m.id}`).join(', ');
  console.log(`[360dialog] Received messages: ${summary}`);
}
