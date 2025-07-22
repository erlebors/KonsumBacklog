import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      // No authenticated user - return empty result
      return NextResponse.json({
        folders: [],
        userFolders: [],
        aiGeneratedFolders: []
      });
    }
    
    // Use Firestore for authenticated users
    try {
      const result = await firestoreService.getAvailableFolders(userId);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
      return NextResponse.json({ error: 'Failed to fetch available folders' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching available folders:', error);
    return NextResponse.json({ error: 'Failed to fetch available folders' }, { status: 500 });
  }
} 