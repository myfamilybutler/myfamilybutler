
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

async function mergeUsers() {
  console.log('--- MERGING DUPLICATE USERS ---');

  const TARGET_USER_ID = '4603b675-b37e-408d-a836-51c6730e8f3f'; // The one with Firebase UID (+43...)
  const SOURCE_USER_ID = 'c7805d59-aa8f-40ff-a10b-7b663b9594a3'; // The latest duplicate (43...)

  if (!TARGET_USER_ID || !SOURCE_USER_ID) {
    console.error('Missing user IDs');
    return;
  }

  // 1. Move Events
  console.log('Moving events...');
  const { error: eventError, count: eventCount } = await supabase
    .from('events')
    .update({ created_by: TARGET_USER_ID })
    .eq('created_by', SOURCE_USER_ID)
    // @ts-expect-error - Supabase select arguments type mismatch
    .select('*', { count: 'exact' });

  if (eventError) console.error('Event move failed:', eventError);
  else console.log(`Moved ${eventCount} events.`);
  
  // Note: events table has created_by column? 
  // Let's check schema/types. Event interface says: created_by?: string.

  // 2. Move Reminders
  console.log('Moving reminders...');
  const { error: reminderError, count: reminderCount } = await supabase
    .from('reminders')
    .update({ user_id: TARGET_USER_ID })
    .eq('user_id', SOURCE_USER_ID)
    // @ts-expect-error - Supabase select arguments type mismatch
    .select('*', { count: 'exact' });

  if (reminderError) console.error('Reminder move failed:', reminderError);
  else console.log(`Moved ${reminderCount} reminders.`);

  // 3. Delete Source User
  console.log('Deleting source user...');
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', SOURCE_USER_ID);

  if (deleteError) {
    console.error('Delete failed:', deleteError);
  } else {
    console.log('Source user deleted successfully.');
  }
}

mergeUsers();
