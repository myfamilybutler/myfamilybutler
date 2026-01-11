#!/usr/bin/env npx ts-node
/**
 * Admin Script: Merge Duplicate User Accounts
 * 
 * This script merges two duplicate user accounts into one.
 * The "source" account's data is merged into the "target" account,
 * then the source account is deleted.
 * 
 * Usage:
 *   npx ts-node scripts/merge-users.ts <source-user-id> <target-user-id>
 * 
 * What gets merged:
 *   - Phone number (if target doesn't have one)
 *   - Email (if target doesn't have one)
 *   - Telegram chat ID (if target doesn't have one)
 *   - Display name (if target doesn't have one)
 *   - Events (re-assigned to target)
 *   - Reminders (re-assigned to target)
 *   - Messages (re-assigned to target)
 * 
 * Safety:
 *   - Requires confirmation before merging
 *   - Creates a backup log of what was merged
 *   - Only deletes source after successful merge
 * 
 * Environment:
 *   Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load env from .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface User {
  id: string;
  phone_number: string | null;
  linked_email: string | null;
  display_name: string | null;
  telegram_chat_id: string | null;
  whatsapp_verified: boolean | null;
  household_id: string | null;
  created_at: string;
}

async function promptConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching user ${userId}:`, error.message);
    return null;
  }
  return data;
}

function formatUser(user: User): string {
  return `
  ID: ${user.id}
  Phone: ${user.phone_number || 'None'}
  Email: ${user.linked_email || 'None'}
  Name: ${user.display_name || 'None'}
  Telegram: ${user.telegram_chat_id ? 'Linked' : 'None'}
  WhatsApp: ${user.whatsapp_verified ? 'Verified' : 'None'}
  Household: ${user.household_id || 'None'}
  Created: ${new Date(user.created_at).toLocaleDateString()}
`;
}

async function countUserData(userId: string): Promise<{
  events: number;
  reminders: number;
  messages: number;
}> {
  const [events, reminders, messages] = await Promise.all([
    admin.from('events').select('id', { count: 'exact', head: true }).eq('created_by', userId),
    admin.from('reminders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    events: events.count || 0,
    reminders: reminders.count || 0,
    messages: messages.count || 0,
  };
}

async function mergeUsers(sourceId: string, targetId: string) {
  console.log('\n🔍 Fetching users...\n');

  // Fetch both users
  const source = await getUser(sourceId);
  const target = await getUser(targetId);

  if (!source) {
    console.error(`❌ Source user not found: ${sourceId}`);
    process.exit(1);
  }

  if (!target) {
    console.error(`❌ Target user not found: ${targetId}`);
    process.exit(1);
  }

  // Show user details
  console.log('═══════════════════════════════════════════════════════');
  console.log('📤 SOURCE USER (will be merged and deleted):');
  console.log('═══════════════════════════════════════════════════════');
  console.log(formatUser(source));

  const sourceData = await countUserData(sourceId);
  console.log(`  Events: ${sourceData.events}`);
  console.log(`  Reminders: ${sourceData.reminders}`);
  console.log(`  Messages: ${sourceData.messages}`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📥 TARGET USER (will receive merged data):');
  console.log('═══════════════════════════════════════════════════════');
  console.log(formatUser(target));

  const targetData = await countUserData(targetId);
  console.log(`  Events: ${targetData.events}`);
  console.log(`  Reminders: ${targetData.reminders}`);
  console.log(`  Messages: ${targetData.messages}`);

  // Show what will be merged
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔄 MERGE PLAN:');
  console.log('═══════════════════════════════════════════════════════');

  const updates: Record<string, unknown> = {};
  const mergeActions: string[] = [];

  if (source.phone_number && !target.phone_number) {
    updates.phone_number = source.phone_number;
    updates.phone_verified = true;
    mergeActions.push(`• Phone: ${source.phone_number}`);
  }

  if (source.linked_email && !target.linked_email) {
    updates.linked_email = source.linked_email;
    mergeActions.push(`• Email: ${source.linked_email}`);
  }

  if (source.telegram_chat_id && !target.telegram_chat_id) {
    updates.telegram_chat_id = source.telegram_chat_id;
    mergeActions.push(`• Telegram: Linked`);
  }

  if (source.display_name && !target.display_name) {
    updates.display_name = source.display_name;
    mergeActions.push(`• Display Name: ${source.display_name}`);
  }

  if (source.whatsapp_verified && !target.whatsapp_verified) {
    updates.whatsapp_verified = true;
    mergeActions.push(`• WhatsApp: Verified`);
  }

  if (mergeActions.length > 0) {
    console.log('\nWill copy to target:');
    mergeActions.forEach((a) => console.log(a));
  } else {
    console.log('\nNo user fields to merge (target has all data)');
  }

  console.log('\nWill re-assign:');
  console.log(`• ${sourceData.events} events`);
  console.log(`• ${sourceData.reminders} reminders`);
  console.log(`• ${sourceData.messages} messages`);

  console.log('\n⚠️  SOURCE USER WILL BE DELETED AFTER MERGE');

  // Confirm
  const confirmed = await promptConfirm('\n🚨 Are you sure you want to proceed?');

  if (!confirmed) {
    console.log('\n❌ Merge cancelled.');
    process.exit(0);
  }

  console.log('\n🔄 Merging...\n');

  // Step 1: Update target user with source's data
  if (Object.keys(updates).length > 0) {
    updates.identity_linked_at = new Date().toISOString();
    const { error: updateError } = await admin
      .from('users')
      .update(updates)
      .eq('id', targetId);

    if (updateError) {
      console.error('❌ Error updating target user:', updateError.message);
      process.exit(1);
    }
    console.log('✅ Merged user fields');
  }

  // Step 2: Re-assign events
  if (sourceData.events > 0) {
    const { error } = await admin
      .from('events')
      .update({ created_by: targetId })
      .eq('created_by', sourceId);

    if (error) {
      console.error('❌ Error re-assigning events:', error.message);
      process.exit(1);
    }
    console.log(`✅ Re-assigned ${sourceData.events} events`);
  }

  // Step 3: Re-assign reminders
  if (sourceData.reminders > 0) {
    const { error } = await admin
      .from('reminders')
      .update({ user_id: targetId })
      .eq('user_id', sourceId);

    if (error) {
      console.error('❌ Error re-assigning reminders:', error.message);
      process.exit(1);
    }
    console.log(`✅ Re-assigned ${sourceData.reminders} reminders`);
  }

  // Step 4: Re-assign messages
  if (sourceData.messages > 0) {
    const { error } = await admin
      .from('messages')
      .update({ user_id: targetId })
      .eq('user_id', sourceId);

    if (error) {
      console.error('❌ Error re-assigning messages:', error.message);
      process.exit(1);
    }
    console.log(`✅ Re-assigned ${sourceData.messages} messages`);
  }

  // Step 5: Delete source user
  const { error: deleteError } = await admin
    .from('users')
    .delete()
    .eq('id', sourceId);

  if (deleteError) {
    console.error('❌ Error deleting source user:', deleteError.message);
    console.error('⚠️  Data was merged but source user still exists!');
    process.exit(1);
  }
  console.log('✅ Deleted source user');

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ MERGE COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nSource ${sourceId.slice(0, 8)}... was merged into target ${targetId.slice(0, 8)}...`);
  console.log('The source user has been deleted.\n');

  // Log for audit
  console.log('📋 Audit log:');
  console.log(JSON.stringify({
    action: 'user_merge',
    timestamp: new Date().toISOString(),
    source_id: sourceId,
    target_id: targetId,
    merged_fields: Object.keys(updates),
    reassigned: {
      events: sourceData.events,
      reminders: sourceData.reminders,
      messages: sourceData.messages,
    },
  }, null, 2));
}

// Main
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: npx ts-node scripts/merge-users.ts <source-user-id> <target-user-id>');
  console.error('\nExample:');
  console.error('  npx ts-node scripts/merge-users.ts abc123 def456');
  console.error('\nThe source user will be merged INTO the target user, then deleted.');
  process.exit(1);
}

const [sourceId, targetId] = args;

if (sourceId === targetId) {
  console.error('❌ Source and target cannot be the same user!');
  process.exit(1);
}

mergeUsers(sourceId, targetId).catch(console.error);
