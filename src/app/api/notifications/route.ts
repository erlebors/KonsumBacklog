import { NextRequest, NextResponse } from 'next/server';
import { tipsService } from '@/lib/tipsService';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser, isDemoMode } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    let tips;
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        tips = await firestoreService.getAllTips(userId);
      } catch (error) {
        console.error('Error fetching from Firestore, falling back to demo mode:', error);
        tips = await tipsService.getAllTips();
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      tips = await tipsService.getAllTips();
    }
    
    const today = new Date();
    const urgentTips = tips.filter(tip => {
      if (tip.isProcessed) return false;
      if (!tip.relevanceDate) return false;
      
      const relevanceDate = new Date(tip.relevanceDate);
      const daysUntil = Math.ceil((relevanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Return tips that are due within 7 days
      return daysUntil <= 7 && daysUntil >= 0;
    });

    const notifications = urgentTips.map(tip => ({
      id: tip.id,
      type: 'urgent_tip',
      title: 'Tip needs attention',
      message: `Tip "${tip.content?.substring(0, 50)}..." is relevant on ${new Date(tip.relevanceDate!).toLocaleDateString()}`,
      relevanceDate: tip.relevanceDate,
      tipId: tip.id
    }));

    return NextResponse.json({ 
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return empty notifications instead of error to prevent 500
    return NextResponse.json({ 
      notifications: [],
      count: 0
    });
  }
} 