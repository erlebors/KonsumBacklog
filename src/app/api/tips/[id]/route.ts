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
    
    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Use Firestore for authenticated users
    let updatedTip;
    try {
      updatedTip = await firestoreService.updateTip(userId, id, body);
    } catch (error) {
      console.error('Error updating in Firestore:', error);
      return NextResponse.json({ error: 'Failed to update in Firestore' }, { status: 500 });
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
    
    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Use Firestore for authenticated users
    let success;
    try {
      success = await firestoreService.deleteTip(userId, id);
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      return NextResponse.json({ error: 'Failed to delete from Firestore' }, { status: 500 });
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