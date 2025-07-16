import { NextRequest, NextResponse } from 'next/server';
import { tipsService } from '@/lib/tipsService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updatedTip = await tipsService.updateTip(id, body);
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
    
    const success = await tipsService.deleteTip(id);
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