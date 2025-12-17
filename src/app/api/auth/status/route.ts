import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUserBySupabaseId } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId, email } = await request.json();
    
    if (!supabaseUserId || !email) {
      return NextResponse.json(
        { error: 'Missing supabaseUserId or email' },
        { status: 400 }
      );
    }
    
    // Find or create user in Supabase
    const user = await findOrCreateUserBySupabaseId(supabaseUserId, email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to find or create user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      userId: user.id,
      onboardingCompleted: user.onboarding_completed ?? false,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
