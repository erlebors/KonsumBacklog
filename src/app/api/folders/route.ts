import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      // No authenticated user - return empty array
      return NextResponse.json([]);
    }
    
    // Use Firestore for authenticated users
    try {
      const folders = await firestoreService.getAllFolders(userId);
      return NextResponse.json(folders);
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
      return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, color } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use Firestore for authenticated users
    let folder;
    try {
      folder = await firestoreService.addFolder(userId, {
        name: name.trim(),
        description: description?.trim(),
        color: color || '#3B82F6', // Default blue color
      });
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      return NextResponse.json({ error: 'Failed to save to Firestore' }, { status: 500 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, color } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use Firestore for authenticated users
    let folder;
    try {
      folder = await firestoreService.updateFolder(userId, id, {
        name: name.trim(),
        description: description?.trim(),
        color,
      });
    } catch (error) {
      console.error('Error updating in Firestore:', error);
      return NextResponse.json({ error: 'Failed to update in Firestore' }, { status: 500 });
    }

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // Try to get authenticated user
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use Firestore for authenticated users
    let success;
    try {
      success = await firestoreService.deleteFolder(userId, id);
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      return NextResponse.json({ error: 'Failed to delete from Firestore' }, { status: 500 });
    }
    
    if (!success) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
} 