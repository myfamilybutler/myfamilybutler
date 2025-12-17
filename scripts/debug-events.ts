
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');

const envVars: Record<string, string> = {};
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEvents() {
  console.log('--- GLOBAL DIAGNOSTICS ---');

  // 1. Check ALL Users with this phone number (fuzzy)
  const phoneSuffix = '6647929129'; 
  console.log(`Searching for users with phone suffix: ...${phoneSuffix}`);
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .like('phone_number', `%${phoneSuffix}`);
    
  if (userError) console.error('Error fetching users:', userError);
  console.log('Users found:', users?.length ?? 0);
  if (users) {
      users.forEach(u => {
          console.log(`- User: ${u.id}, Phone: ${u.phone_number}, Household: ${u.household_id}, Creator: ${u.created_at}`);
      });
  }

  // 2. Check Recent Messages (Last 5)
  console.log('Checking recent messages...');
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (msgError) {
    console.error('Error fetching messages:', msgError);
  } else {
    console.log('Recent Messages:', messages.length);
    messages.forEach(m => {
      console.log(`- [${m.created_at}] Role: ${m.role}, User: ${m.user_id}, Content: "${m.content.substring(0, 50)}..."`);
    });
  }

  // 3. Check Recent Events (Last 10)
  console.log('Checking recent events...');
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching events:', error);
  } else {
    console.log('Recent Events:', events.length);
    events.forEach(e => {
      console.log(`- [${e.event_date}] ${e.title} (Household: ${e.household_id}, CreatedBy: ${e.created_by})`);
    });
  }
}

checkEvents();
