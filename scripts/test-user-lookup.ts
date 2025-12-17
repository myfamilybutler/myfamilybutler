
import * as fs from 'fs';
import * as path from 'path';

// 1. Load env vars manually BEFORE importing supabase
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');

envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    const val = value.trim().replace(/^["']|["']$/g, '');
    process.env[key.trim()] = val;
  }
});

async function testUserLookup() {
  console.log('--- TESTING USER LOOKUP ---');
  
  // Dynamic import AFTER env vars are loaded
  const { findOrCreateUser } = await import('../src/lib/supabase');
  
  const rawPhone = '436647929129';
  const e164Phone = '+436647929129';
  
  console.log(`1. Looking up RAW phone: ${rawPhone}`);
  const user1 = await findOrCreateUser(rawPhone);
  console.log('User 1:', user1?.id, user1?.phone_number);
  
  console.log(`2. Looking up E.164 phone: ${e164Phone}`);
  const user2 = await findOrCreateUser(e164Phone);
  console.log('User 2:', user2?.id, user2?.phone_number);
  
  if (user1?.id === user2?.id) {
    console.log('✅ SUCCESS: Both formats resolve to SAME user.');
  } else {
    console.error('❌ FAILURE: Formats resolved to DIFFERENT users.');
  }
}

testUserLookup();
