import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { addDays, isAfter } from 'date-fns';

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

// Initialize tips on module load
loadTips();

export async function GET() {
  try {
    await loadTips(); // Refresh tips from file
    
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
      message: `Tip "${tip.content?.substring(0, 50)}..." is relevant on ${new Date(tip.relevanceDate).toLocaleDateString()}`,
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