import { NextRequest, NextResponse } from 'next/server';
import { tipsService } from '@/lib/tipsService';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser, isDemoMode } from '@/lib/authUtils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    let updatedTip;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        updatedTip = await firestoreService.updateTip(userId, id, body);
      } catch (error) {
        console.error('Error updating in Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return error instead
        return NextResponse.json({ error: 'Failed to update in Firestore' }, { status: 500 });
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      updatedTip = await tipsService.updateTip(id, body);
    }
    
    if (!updatedTip) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Tip updated successfully',
      tip: updatedTip
    });
  } catch (error) {
    console.error('Error updating tip:', error);
    return NextResponse.json(
      { error: 'Failed to update tip' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    let success;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        success = await firestoreService.deleteTip(userId, id);
      } catch (error) {
        console.error('Error deleting from Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return error instead
        return NextResponse.json({ error: 'Failed to delete from Firestore' }, { status: 500 });
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      success = await tipsService.deleteTip(id);
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Tip deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tip:', error);
    return NextResponse.json(
      { error: 'Failed to delete tip' },
      { status: 500 }
    );
  }
} 