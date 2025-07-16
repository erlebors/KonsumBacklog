import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  try {
    // Check if Redis environment variables are available (support both naming conventions)
    const hasRedisEnv = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) && 
                       (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);
    
    if (!hasRedisEnv) {
      return NextResponse.json({
        status: 'error',
        message: 'Redis environment variables not configured',
        hasRedisEnv: false,
        availableVars: {
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN
        }
      });
    }

    // Try to initialize Redis with your specific environment variables
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const redis = new Redis({
      url: redisUrl!,
      token: redisToken!,
    });
    
    // Test Redis connection
    const testKey = 'test-connection';
    const testValue = { message: 'Hello from Redis!', timestamp: new Date().toISOString() };
    
    // Set a test value
    await redis.set(testKey, testValue);
    
    // Get the test value
    const retrievedValue = await redis.get(testKey);
    
    // Clean up
    await redis.del(testKey);
    
    return NextResponse.json({
      status: 'success',
      message: 'Redis connection working',
      hasRedisEnv: true,
      testValue: retrievedValue,
      timestamp: new Date().toISOString(),
      usedUrl: redisUrl
    });
    
  } catch (error) {
    console.error('Redis test error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Redis connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      hasRedisEnv: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)
    }, { status: 500 });
  }
} 