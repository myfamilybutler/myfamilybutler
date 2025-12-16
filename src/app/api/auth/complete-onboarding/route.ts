import { NextRequest, NextResponse } from 'next/server';
import { updateOnboardingCompleted } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid } = await request.json();
    
    if (!firebaseUid) {
      return NextResponse.json(
        { error: 'Missing firebaseUid' },
        { status: 400 }
      );
    }
    
    const success = await updateOnboardingCompleted(firebaseUid);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update onboarding status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
