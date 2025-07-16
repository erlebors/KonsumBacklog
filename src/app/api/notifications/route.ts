import { NextResponse } from 'next/server';
import { tipsService } from '@/lib/tipsService';

export async function GET() {
  try {
    // Use the tipsService to get all tips
    const allTips = await tipsService.getAllTips();
    
    const today = new Date();
    const urgentTips = allTips.filter(tip => {
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
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
} 