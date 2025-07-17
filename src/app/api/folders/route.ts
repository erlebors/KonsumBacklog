import { NextRequest, NextResponse } from 'next/server';
import { foldersService } from '@/lib/foldersService';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser, isDemoMode } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    let folders;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        folders = await firestoreService.getAllFolders(userId);
      } catch (error) {
        console.error('Error fetching from Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return empty array instead
        return NextResponse.json([]);
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      folders = await foldersService.getAllFolders();
    }
    
    return NextResponse.json(folders);
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

    let folder;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        folder = await firestoreService.addFolder(userId, {
          name: name.trim(),
          description: description?.trim(),
          color: color || '#3B82F6', // Default blue color
        });
      } catch (error) {
        console.error('Error saving to Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return error instead
        return NextResponse.json({ error: 'Failed to save to Firestore' }, { status: 500 });
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      folder = await foldersService.addFolder({
        name: name.trim(),
        description: description?.trim(),
        color: color || '#3B82F6', // Default blue color
      });
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

    let folder;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        folder = await firestoreService.updateFolder(userId, id, {
          name: name.trim(),
          description: description?.trim(),
          color,
        });
      } catch (error) {
        console.error('Error updating in Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return error instead
        return NextResponse.json({ error: 'Failed to update in Firestore' }, { status: 500 });
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      folder = await foldersService.updateFolder(id, {
        name: name.trim(),
        description: description?.trim(),
        color,
      });
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

    let success;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        success = await firestoreService.deleteFolder(userId, id);
      } catch (error) {
        console.error('Error deleting from Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return error instead
        return NextResponse.json({ error: 'Failed to delete from Firestore' }, { status: 500 });
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      success = await foldersService.deleteFolder(id);
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