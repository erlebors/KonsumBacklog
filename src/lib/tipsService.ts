import { promises as fs } from 'fs';
import path from 'path';

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

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'tips.json');
    this.loadTips();
  }

  private async loadTips() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      this.tips = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      this.tips = [];
    }
  }

  private async saveTips() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(
        this.dataPath,
        JSON.stringify(this.tips, null, 2)
      );
    } catch (error) {
      console.error('Error saving tips:', error);
      throw error;
    }
  }

  async getAllTips(): Promise<Tip[]> {
    await this.loadTips(); // Reload from file to get latest data
    return this.tips;
  }

  async addTip(tip: Tip): Promise<Tip> {
    await this.loadTips(); // Reload from file
    this.tips.push(tip);
    await this.saveTips();
    return tip;
  }

  async updateTip(id: string, updates: Partial<Tip>): Promise<Tip | null> {
    await this.loadTips(); // Reload from file
    const tipIndex = this.tips.findIndex(tip => tip.id === id);
    if (tipIndex === -1) {
      return null;
    }

    this.tips[tipIndex] = { ...this.tips[tipIndex], ...updates };
    await this.saveTips();
    return this.tips[tipIndex];
  }

  async deleteTip(id: string): Promise<boolean> {
    await this.loadTips(); // Reload from file
    const tipIndex = this.tips.findIndex(tip => tip.id === id);
    if (tipIndex === -1) {
      return false;
    }

    this.tips.splice(tipIndex, 1);
    await this.saveTips();
    return true;
  }

  async getTip(id: string): Promise<Tip | null> {
    await this.loadTips(); // Reload from file
    return this.tips.find(tip => tip.id === id) || null;
  }
}

// Export a singleton instance
export const tipsService = new TipsService(); 