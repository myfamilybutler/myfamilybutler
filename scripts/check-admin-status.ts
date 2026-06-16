
import * as dotenv from 'dotenv';
import { resolve } from 'path';

import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Load env vars from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });
// Fallback to .env
dotenv.config({ path: resolve(__dirname, '../.env') });

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Lazy import to ensure env vars are loaded
const { getAdminClient } = require('../src/lib/supabase/client');

async function checkAdmin() {
  const email = process.env.ADMIN_EMAIL || 'info@myfamilybutler.com';
  console.log(`Checking admin status for: ${email}`);

  const admin = getAdminClient();
  
  // 1. Find user by linked_email (since 'email' column doesn't exist on users table)
  const { data: users, error: searchError } = await admin
    .from('users')
    .select('id, display_name, is_admin, linked_email')
    .eq('linked_email', email);

  if (searchError) {
    console.error('Search Error:', searchError);
    return;
  }

  if (!users || users.length === 0) {
    console.error('User not found!');
    return;
  }

  const user = users[0];
  console.log('User Found:', user);

  if (user.is_admin) {
    console.log('✅ SUCCESS: User is an ADMIN.');
  } else {
    console.error('❌ FAILURE: User is NOT an admin.');
  }
}

checkAdmin();
