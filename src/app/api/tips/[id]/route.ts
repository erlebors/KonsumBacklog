import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser } from '@/lib/authUtils';

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
    try {
      await firestoreService.updateTip(userId, id, body);
      
      // Fetch the updated tip to return it
      const tips = await firestoreService.getAllTips(userId);
      const updatedTip = tips.find(tip => tip.id === id);
      
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
      console.error('Error updating in Firestore:', error);
      return NextResponse.json({ error: 'Failed to update in Firestore' }, { status: 500 });
    }
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
    try {
      await firestoreService.deleteTip(userId, id);
      return NextResponse.json({ 
        message: 'Tip deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      return NextResponse.json({ error: 'Failed to delete from Firestore' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting tip:', error);
    return NextResponse.json(
      { error: 'Failed to delete tip' },
      { status: 500 }
    );
  }
} 