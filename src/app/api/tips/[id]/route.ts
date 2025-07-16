import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// In-memory storage for demo purposes
let tips: any[] = [];

// Load tips from file
const loadTips = async () => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'tips.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    tips = JSON.parse(data);
  } catch (error) {
    tips = [];
  }
};

// Save tips to file
const saveTips = async () => {
  try {
    const dataPath = path.join(process.cwd(), 'data');
    await fs.mkdir(dataPath, { recursive: true });
    await fs.writeFile(
      path.join(dataPath, 'tips.json'),
      JSON.stringify(tips, null, 2)
    );
  } catch (error) {
    console.error('Error saving tips:', error);
  }
};

// Initialize tips on module load
loadTips();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const tipIndex = tips.findIndex(tip => tip.id === id);
    if (tipIndex === -1) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    // Update the tip
    tips[tipIndex] = { ...tips[tipIndex], ...body };
    await saveTips();

    return NextResponse.json({ 
      message: 'Tip updated successfully',
      tip: tips[tipIndex]
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
    
    const tipIndex = tips.findIndex(tip => tip.id === id);
    if (tipIndex === -1) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      );
    }

    // Remove the tip
    tips.splice(tipIndex, 1);
    await saveTips();

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