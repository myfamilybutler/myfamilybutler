/**
 * POST /api/auth/dev-login
 * 
 * DEV-ONLY password login for browser testing.
 * SECURITY: Returns 404 in production BEFORE any imports or processing.
 */

// SECURITY: Early exit in production - must be before any other code
const isDevelopment = process.env.NODE_ENV === 'development';

// Only import dependencies in development
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Production: Return 404 immediately
  if (!isDevelopment) {
    return new Response(null, { status: 404 });
  }

  // Development-only imports (dynamic to avoid bundling in production)
  const { cookies } = await import('next/headers');
  const { getAdminClient } = await import('@/lib/supabase');
  const { log } = await import('@/lib/utils/logger');

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Check against env credentials
    const testEmail = process.env.E2E_TEST_EMAIL;
    const testPassword = process.env.E2E_TEST_PASSWORD;

    if (!testEmail || !testPassword) {
      log.error('[Dev Login] E2E_TEST_EMAIL or E2E_TEST_PASSWORD not set in .env.local');
      return NextResponse.json(
        { success: false, error: 'Dev credentials not configured' },
        { status: 500 }
      );
    }

    if (email !== testEmail || password !== testPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Credentials valid - find or create test user
    const supabase = getAdminClient();
    
    // Check if test user exists in our users table
    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('linked_email', testEmail)
      .single();

    // Create test user if doesn't exist
    if (!existingUser) {
      log.info('[Dev Login] Creating test user for:', testEmail);
      
      // First, get or create a test household
      let { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('name', 'Test Household')
        .single();

      if (!household) {
        const { data: newHousehold, error: householdError } = await supabase
          .from('households')
          .insert({ name: 'Test Household' })
          .select('id')
          .single();
        
        if (householdError) {
          log.error('[Dev Login] Failed to create household:', householdError);
          return NextResponse.json(
            { success: false, error: 'Failed to create test environment' },
            { status: 500 }
          );
        }
        household = newHousehold;
      }

      // Create the test user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          linked_email: testEmail,
          display_name: 'Test User',
          household_id: household.id,
          onboarding_source: 'web',
        })
        .select('*')
        .single();

      if (userError) {
        log.error('[Dev Login] Failed to create user:', userError);
        return NextResponse.json(
          { success: false, error: 'Failed to create test user' },
          { status: 500 }
        );
      }

      existingUser = newUser;
    }

    // Set session cookies
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Dev only, doesn't need secure
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    };

    cookieStore.set('session_authenticated', 'true', cookieOptions);
    cookieStore.set('session_user_id', existingUser.id, cookieOptions);

    log.info('[Dev Login] Session created for test user:', existingUser.id);

    return NextResponse.json({
      success: true,
      user: existingUser,
      message: 'Dev login successful',
    });

  } catch (error) {
    const { log: errorLog } = await import('@/lib/utils/logger');
    errorLog.error('[Dev Login] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return 404 for any GET requests (e.g., bots probing endpoints)
  return new Response(null, { status: 404 });
}
