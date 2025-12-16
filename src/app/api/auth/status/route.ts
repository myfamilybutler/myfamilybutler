import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUserByFirebaseUid } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, phoneNumber } = await request.json();
    
    if (!firebaseUid || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing firebaseUid or phoneNumber' },
        { status: 400 }
      );
    }
    
    // Find or create user in Supabase
    const user = await findOrCreateUserByFirebaseUid(firebaseUid, phoneNumber);
    
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
