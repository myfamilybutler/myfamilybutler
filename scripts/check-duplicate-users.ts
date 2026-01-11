#!/usr/bin/env npx ts-node
/**
 * Admin Script: Check for Duplicate Users
 * 
 * This script identifies potential duplicate user accounts based on
 * phone numbers and email addresses.
 * 
 * Usage:
 *   npx ts-node scripts/check-duplicate-users.ts
 * 
 * Environment:
 *   Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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
  created_at: string;
}

async function checkDuplicates() {
  console.log('\n🔍 Checking for duplicate users...\n');

  // Fetch all users
  const { data: users, error } = await admin
    .from('users')
    .select('id, phone_number, linked_email, display_name, telegram_chat_id, whatsapp_verified, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching users:', error.message);
    process.exit(1);
  }

  console.log(`📊 Total users: ${users?.length || 0}\n`);

  // Group by phone
  const phoneMap = new Map<string, User[]>();
  const emailMap = new Map<string, User[]>();

  for (const user of users || []) {
    // Normalize phone for grouping
    if (user.phone_number) {
      const normalized = user.phone_number.toLowerCase().replace(/\s/g, '');
      const existing = phoneMap.get(normalized) || [];
      existing.push(user);
      phoneMap.set(normalized, existing);
    }

    // Normalize email for grouping
    if (user.linked_email) {
      const normalized = user.linked_email.toLowerCase().trim();
      const existing = emailMap.get(normalized) || [];
      existing.push(user);
      emailMap.set(normalized, existing);
    }
  }

  // Find duplicates
  const phoneDuplicates = [...phoneMap.entries()].filter(([, v]) => v.length > 1);
  const emailDuplicates = [...emailMap.entries()].filter(([, v]) => v.length > 1);

  // === Report Phone Duplicates ===
  console.log('═══════════════════════════════════════════════════════');
  console.log('📱 PHONE NUMBER DUPLICATES');
  console.log('═══════════════════════════════════════════════════════');

  if (phoneDuplicates.length === 0) {
    console.log('✅ No phone number duplicates found!\n');
  } else {
    console.log(`⚠️  Found ${phoneDuplicates.length} phone numbers with duplicates:\n`);
    
    for (const [phone, dups] of phoneDuplicates) {
      console.log(`📞 ${phone} (${dups.length} users):`);
      for (const u of dups) {
        const wa = u.whatsapp_verified ? '✓ WA' : '';
        const tg = u.telegram_chat_id ? '✓ TG' : '';
        console.log(`   └── ID: ${u.id.slice(0, 8)}... | Created: ${new Date(u.created_at).toLocaleDateString()} | ${wa} ${tg}`);
      }
      console.log('');
    }
  }

  // === Report Email Duplicates ===
  console.log('═══════════════════════════════════════════════════════');
  console.log('📧 EMAIL DUPLICATES');
  console.log('═══════════════════════════════════════════════════════');

  if (emailDuplicates.length === 0) {
    console.log('✅ No email duplicates found!\n');
  } else {
    console.log(`⚠️  Found ${emailDuplicates.length} emails with duplicates:\n`);
    
    for (const [email, dups] of emailDuplicates) {
      console.log(`📧 ${email} (${dups.length} users):`);
      for (const u of dups) {
        console.log(`   └── ID: ${u.id.slice(0, 8)}... | Created: ${new Date(u.created_at).toLocaleDateString()}`);
      }
      console.log('');
    }
  }

  // === Users without identifiers ===
  console.log('═══════════════════════════════════════════════════════');
  console.log('❓ USERS WITHOUT IDENTIFIERS');
  console.log('═══════════════════════════════════════════════════════');

  const noIdentifiers = (users || []).filter(u => !u.phone_number && !u.linked_email);
  
  if (noIdentifiers.length === 0) {
    console.log('✅ All users have at least one identifier!\n');
  } else {
    console.log(`⚠️  Found ${noIdentifiers.length} users without phone or email:\n`);
    for (const u of noIdentifiers) {
      console.log(`   └── ID: ${u.id.slice(0, 8)}... | Name: ${u.display_name || 'None'} | Created: ${new Date(u.created_at).toLocaleDateString()}`);
    }
    console.log('');
  }

  // === Summary ===
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Total users:           ${users?.length || 0}`);
  console.log(`   Phone duplicates:      ${phoneDuplicates.length}`);
  console.log(`   Email duplicates:      ${emailDuplicates.length}`);
  console.log(`   No identifiers:        ${noIdentifiers.length}`);
  console.log('');

  if (phoneDuplicates.length === 0 && emailDuplicates.length === 0 && noIdentifiers.length === 0) {
    console.log('✅ Database is clean! No duplicates or issues found.');
  } else {
    console.log('⚠️  Issues found. Review the report above.');
  }
  console.log('');
}

// Run the script
checkDuplicates().catch(console.error);
