import { NextResponse } from 'next/server';
import { foldersService } from '@/lib/foldersService';
import { tipsService } from '@/lib/tipsService';

export async function GET() {
  try {
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

    return NextResponse.json({
      folders: allFolderNames,
      userFolders: userFolderNames,
      aiGeneratedFolders: Array.from(aiGeneratedFolders)
    });
  } catch (error) {
    console.error('Error fetching available folders:', error);
    return NextResponse.json({ error: 'Failed to fetch available folders' }, { status: 500 });
  }
} 