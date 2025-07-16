import { NextResponse } from 'next/server';
import { tipsService } from '@/lib/tipsService';
import { Redis } from '@upstash/redis';

export async function POST() {
  try {
    // Clear tips from the service
    const allTips = await tipsService.getAllTips();
    
    // Delete each tip
    for (const tip of allTips) {
      await tipsService.deleteTip(tip.id);
    }
    
    // Also clear Redis directly if available
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const redis = new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        
        // Clear the tips key
        await redis.del('tips');
        console.log('Cleared tips from Redis');
      } catch (redisError) {
        console.warn('Could not clear Redis:', redisError);
      }
    }
    
    return NextResponse.json({ 
      message: 'All data cleared successfully',
      clearedCount: allTips.length
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
} 