/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting local developer setup for MyFamilyButler...\n');

// 1. Setup environment variables file
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.local.example');

if (!fs.existsSync(envLocalPath)) {
  console.log('📁 Copying .env.local.example to .env.local...');
  try {
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('✅ Created .env.local successfully.');
  } catch (err) {
    console.error('❌ Failed to copy .env.local:', err.message);
  }
} else {
  console.log('✅ .env.local file already exists.');
}

// 2. Check for local Supabase CLI setup
console.log('\n🔍 Checking local Supabase setup...');
try {
  // Check if docker is running
  console.log('🐳 Checking if Docker daemon is running...');
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker is running.');

  console.log('⚡ Initializing local Supabase database...');
  console.log('   (This will start local Docker containers and apply migrations + seed data)');
  
  // Start supabase local containers
  execSync('npx supabase start', { stdio: 'inherit' });
  
  // Reset the database (runs migrations and seeds from supabase/seed.sql)
  console.log('🌱 Applying database migrations and loading seed data...');
  execSync('npx supabase db reset', { stdio: 'inherit' });
  
  console.log('\n🎉 Local database is ready and seeded!');
  console.log('   Check the mock users, household, and calendar events in your local Supabase Studio.');
  
} catch (err) {
  console.log('\n⚠️  Supabase Local Setup Skipped:');
  console.log('   Could not start local Supabase containers automatically.');
  console.log('   Reason: Make sure Docker is running if you want to use the local Supabase environment.');
  console.log('\n💡 To run without local Docker:');
  console.log('   1. Setup a free project on https://supabase.com');
  console.log('   2. Populate the keys in .env.local');
  console.log('   3. Run the schema from supabase/schema.sql in the Supabase SQL Editor.');
}

console.log('\n🌟 Setup complete! Run the app with:');
console.log('   npm run dev\n');
