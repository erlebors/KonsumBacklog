import { NextRequest, NextResponse } from 'next/server';
import { foldersService } from '@/lib/foldersService';
import { tipsService } from '@/lib/tipsService';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser, isDemoMode } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    let result;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        result = await firestoreService.getAvailableFolders(userId);
      } catch (error) {
        console.error('Error fetching from Firestore:', error);
        // Don't fall back to demo mode for authenticated users - return empty result instead
        return NextResponse.json({
          folders: [],
          userFolders: [],
          aiGeneratedFolders: []
        });
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      // Get user-created folders
      const userFolders = await foldersService.getAllFolders();
      const userFolderNames = userFolders.map(folder => folder.name);

      // Get AI-generated folders from existing tips
      const allTips = await tipsService.getAllTips();
      const aiGeneratedFolders = new Set<string>();
      
      allTips.forEach(tip => {
        if (tip.folder && tip.folder.trim()) {
          aiGeneratedFolders.add(tip.folder.trim());
        }
      });

      // Combine and deduplicate folder names
      const allFolderNames = [...new Set([...userFolderNames, ...Array.from(aiGeneratedFolders)])];
      
      // Sort alphabetically
      allFolderNames.sort();

      result = {
        folders: allFolderNames,
        userFolders: userFolderNames,
        aiGeneratedFolders: Array.from(aiGeneratedFolders)
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching available folders:', error);
    return NextResponse.json({ error: 'Failed to fetch available folders' }, { status: 500 });
  }
} 