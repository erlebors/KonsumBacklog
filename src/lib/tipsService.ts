import { promises as fs } from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

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
  private useKV: boolean = false;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'tips.json');
    this.isProduction = process.env.NODE_ENV === 'production';
    this.useKV = this.isProduction && !!process.env.KV_URL;
    this.loadTips();
  }

  private async loadTips() {
    try {
      if (this.useKV) {
        // Use Vercel KV in production
        const tipsData = await kv.get('tips');
        this.tips = tipsData ? (tipsData as Tip[]) : [];
      } else if (this.isProduction) {
        // Fallback to in-memory storage in production if KV not configured
        console.warn('Vercel KV not configured, using in-memory storage (data will not persist)');
        this.tips = [];
      } else {
        // Use file system in development
        const data = await fs.readFile(this.dataPath, 'utf-8');
        this.tips = JSON.parse(data);
      }
    } catch {
      // File doesn't exist yet or KV not configured, start with empty array
      this.tips = [];
    }
  }

  private async saveTips() {
    try {
      if (this.useKV) {
        // Use Vercel KV in production
        await kv.set('tips', this.tips);
      } else if (this.isProduction) {
        // In-memory storage in production - no persistence
        console.warn('Using in-memory storage - data will not persist between requests');
      } else {
        // Use file system in development
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
          this.dataPath,
          JSON.stringify(this.tips, null, 2)
        );
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