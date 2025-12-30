import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth/helpers';
import { sendWhatsAppMessage } from '@/lib/channels/whatsapp/send';
import { sendTelegramMessage } from '@/lib/channels/telegram/send';

// Increase timeout for long running broadcasts
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    // 1. Auth Check
    const session = await validateSession();
    const admin = getAdminClient();
    
    // Check if requester is admin
    const { data: requester } = await admin
      .from('users')
      .select('is_admin, phone_number, telegram_chat_id')
      .eq('id', session.userId)
      .single();

    if (!requester?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { message, channel, testOnly } = body;

    let targetUsers = [];

    if (testOnly) {
      // Send only to self
      targetUsers = [requester];
    } else {
      // Send to all
      let query = admin.from('users').select('phone_number, telegram_chat_id, onboarding_source');
      
      if (channel !== 'all') {
        query = query.eq('onboarding_source', channel);
      }

      const { data } = await query;
      targetUsers = data || [];
    }

    let sent = 0;
    let failed = 0;

    // Send logic with simple Promise.all (chunking recommended for huge lists, 
    // but OK for MVP with < 100 users)
    // Send logic with batching to avoid rate limits
    const CHUNK_SIZE = 5;
    for (let i = 0; i < targetUsers.length; i += CHUNK_SIZE) {
      const chunk = targetUsers.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (user) => {
        try {
          let success = false;
          // Determine channel priority
          if (user.telegram_chat_id && (channel === 'all' || channel === 'telegram')) {
            const res = await sendTelegramMessage(user.telegram_chat_id, message);
            if (res.success) success = true;
          } 
          
          if (!success && user.phone_number && (channel === 'all' || channel === 'whatsapp')) {
             const res = await sendWhatsAppMessage(user.phone_number, message);
             if (res.success) success = true;
          }

          if (success) sent++;
          else failed++;
        } catch (e) {
          failed++;
          console.error('Broadcast send error', e);
        }
      }));
      
      // small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ success: true, sent, failed });

  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
