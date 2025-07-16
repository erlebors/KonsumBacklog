import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

export interface Tip {
  id: string;
  content: string;
  url: string;
  relevanceDate: string | null;
  relevanceEvent: string | null;
  createdAt: string;
  folder?: string;
  priority?: string;
  summary?: string;
  pageSummary?: string;
  tags?: string[];
  actionRequired?: boolean;
  estimatedTime?: string;
  isProcessed?: boolean;
  aiProcessed?: boolean;
  aiError?: string;
  userContext?: string;
  needsMoreInfo?: boolean;
  urgencyLevel?: string;
}

class TipsService {
  private tips: Tip[] = [];
  private dataPath: string;
  private isProduction: boolean;
  private redis: Redis | null = null;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'tips.json');
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize Redis in production if environment variables are available
    if (this.isProduction && (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) {
      try {
        // Use the environment variables you have
        const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
        
        if (redisUrl && redisToken) {
          this.redis = new Redis({
            url: redisUrl,
            token: redisToken,
          });
          console.log('Upstash Redis initialized successfully with custom config');
        } else {
          console.warn('Redis URL or token missing, falling back to in-memory storage');
          this.redis = null;
        }
      } catch (error) {
        console.warn('Failed to initialize Upstash Redis:', error);
        this.redis = null;
      }
    }
    
    this.loadTips();
  }

  private async loadTips() {
    try {
      if (this.redis) {
        // Use Upstash Redis in production
        console.log('Loading tips from Redis...');
        const tipsData = await this.redis.get('tips');
        this.tips = tipsData ? (tipsData as Tip[]) : [];
        console.log(`Loaded ${this.tips.length} tips from Redis`);
      } else if (this.isProduction) {
        // Fallback to in-memory storage in production if Redis not configured
        console.warn('Upstash Redis not configured, using in-memory storage (data will not persist)');
        this.tips = [];
      } else {
        // Use file system in development
        console.log('Loading tips from file system...');
        const data = await fs.readFile(this.dataPath, 'utf-8');
        this.tips = JSON.parse(data);
        console.log(`Loaded ${this.tips.length} tips from file system`);
      }
    } catch (error) {
      console.error('Error loading tips:', error);
      // File doesn't exist yet or Redis not configured, start with empty array
      this.tips = [];
    }
  }

  private async saveTips() {
    try {
      if (this.redis) {
        // Use Upstash Redis in production
        console.log(`Saving ${this.tips.length} tips to Redis...`);
        await this.redis.set('tips', this.tips);
        console.log('Tips saved to Redis successfully');
      } else if (this.isProduction) {
        // In-memory storage in production - no persistence
        console.warn('Using in-memory storage - data will not persist between requests');
      } else {
        // Use file system in development
        console.log(`Saving ${this.tips.length} tips to file system...`);
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
          this.dataPath,
          JSON.stringify(this.tips, null, 2)
        );
        console.log('Tips saved to file system successfully');
      }
    } catch (error) {
      console.error('Error saving tips:', error);
      throw error;
    }
  }

  async getAllTips(): Promise<Tip[]> {
    await this.loadTips(); // Reload from storage to get latest data
    return this.tips;
  }

  async addTip(tip: Tip): Promise<Tip> {
    await this.loadTips(); // Reload from storage
    this.tips.push(tip);
    await this.saveTips();
    return tip;
  }

  async updateTip(id: string, updates: Partial<Tip>): Promise<Tip | null> {
    await this.loadTips(); // Reload from storage
    const tipIndex = this.tips.findIndex(tip => tip.id === id);
    if (tipIndex === -1) {
      return null;
    }

    this.tips[tipIndex] = { ...this.tips[tipIndex], ...updates };
    await this.saveTips();
    return this.tips[tipIndex];
  }

  async deleteTip(id: string): Promise<boolean> {
    await this.loadTips(); // Reload from storage
    const tipIndex = this.tips.findIndex(tip => tip.id === id);
    if (tipIndex === -1) {
      return false;
    }

    this.tips.splice(tipIndex, 1);
    await this.saveTips();
    return true;
  }

  async getTip(id: string): Promise<Tip | null> {
    await this.loadTips(); // Reload from storage
    return this.tips.find(tip => tip.id === id) || null;
  }
}

// Export a singleton instance
export const tipsService = new TipsService(); 