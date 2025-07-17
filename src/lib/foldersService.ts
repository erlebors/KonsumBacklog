import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

class FoldersService {
  private folders: Folder[] = [];
  private dataPath: string;
  private isProduction: boolean;
  private redis: Redis | null = null;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'folders.json');
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize Redis if environment variables are available
    if (this.isProduction && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    
    this.loadFolders();
  }

  private async loadFolders() {
    try {
      if (this.redis) {
        // Use Upstash Redis in production
        const foldersData = await this.redis.get('folders');
        this.folders = foldersData ? (foldersData as Folder[]) : [];
      } else if (this.isProduction) {
        // Fallback to in-memory storage in production if Redis not configured
        console.warn('Upstash Redis not configured, using in-memory storage (folders will not persist)');
        this.folders = [];
      } else {
        // Use file system in development
        const data = await fs.readFile(this.dataPath, 'utf-8');
        this.folders = JSON.parse(data);
      }
    } catch {
      // File doesn't exist yet or Redis not configured, start with empty array
      this.folders = [];
    }
  }

  private async saveFolders() {
    try {
      if (this.redis) {
        // Use Upstash Redis in production
        await this.redis.set('folders', this.folders);
      } else if (this.isProduction) {
        // In-memory storage in production - no persistence
        console.warn('Using in-memory storage - folders will not persist between requests');
      } else {
        // Use file system in development
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
          this.dataPath,
          JSON.stringify(this.folders, null, 2)
        );
      }
    } catch (error) {
      console.error('Error saving folders:', error);
      throw error;
    }
  }

  async getAllFolders(): Promise<Folder[]> {
    await this.loadFolders(); // Reload from storage to get latest data
    return this.folders;
  }

  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    await this.loadFolders(); // Reload from storage
    
    const newFolder: Folder = {
      ...folder,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.folders.push(newFolder);
    await this.saveFolders();
    return newFolder;
  }

  async updateFolder(id: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>): Promise<Folder | null> {
    await this.loadFolders(); // Reload from storage
    const folderIndex = this.folders.findIndex(folder => folder.id === id);
    if (folderIndex === -1) {
      return null;
    }

    this.folders[folderIndex] = { 
      ...this.folders[folderIndex], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.saveFolders();
    return this.folders[folderIndex];
  }

  async deleteFolder(id: string): Promise<boolean> {
    await this.loadFolders(); // Reload from storage
    const folderIndex = this.folders.findIndex(folder => folder.id === id);
    if (folderIndex === -1) {
      return false;
    }

    this.folders.splice(folderIndex, 1);
    await this.saveFolders();
    return true;
  }

  async getFolder(id: string): Promise<Folder | null> {
    await this.loadFolders(); // Reload from storage
    return this.folders.find(folder => folder.id === id) || null;
  }

  async getFolderNames(): Promise<string[]> {
    await this.loadFolders(); // Reload from storage
    return this.folders.map(folder => folder.name);
  }
}

// Export a singleton instance
export const foldersService = new FoldersService(); 