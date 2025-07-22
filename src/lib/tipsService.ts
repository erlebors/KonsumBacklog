import fs from 'fs/promises';
import path from 'path';

export interface Tip {
  id: string;
  content: string;
  url: string;
  title?: string;
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

const dataPath = path.join(process.cwd(), 'data', 'tips.json');

class TipsService {
  private async ensureDataFile() {
    try {
      await fs.access(dataPath);
    } catch {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(dataPath), { recursive: true });
      // Create empty tips file
      await fs.writeFile(dataPath, JSON.stringify([]));
    }
  }

  async getAllTips(): Promise<Tip[]> {
    await this.ensureDataFile();
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  }

  async addTip(tip: Omit<Tip, 'id'>): Promise<Tip> {
    const tips = await this.getAllTips();
    const newTip: Tip = {
      ...tip,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    tips.push(newTip);
    await fs.writeFile(dataPath, JSON.stringify(tips, null, 2));
    return newTip;
  }

  async updateTip(id: string, updates: Partial<Tip>): Promise<Tip | null> {
    const tips = await this.getAllTips();
    const index = tips.findIndex(tip => tip.id === id);
    if (index === -1) return null;
    
    tips[index] = { ...tips[index], ...updates };
    await fs.writeFile(dataPath, JSON.stringify(tips, null, 2));
    return tips[index];
  }

  async deleteTip(id: string): Promise<boolean> {
    const tips = await this.getAllTips();
    const filteredTips = tips.filter(tip => tip.id !== id);
    if (filteredTips.length === tips.length) return false;
    
    await fs.writeFile(dataPath, JSON.stringify(filteredTips, null, 2));
    return true;
  }
}

export const tipsService = new TipsService(); 