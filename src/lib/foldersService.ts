import fs from 'fs/promises';
import path from 'path';

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

const dataPath = path.join(process.cwd(), 'data', 'folders.json');

class FoldersService {
  private async ensureDataFile() {
    try {
      await fs.access(dataPath);
    } catch {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(dataPath), { recursive: true });
      // Create empty folders file
      await fs.writeFile(dataPath, JSON.stringify([]));
    }
  }

  async getAllFolders(): Promise<Folder[]> {
    await this.ensureDataFile();
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  }

  async getFolderNames(): Promise<string[]> {
    const folders = await this.getAllFolders();
    return folders.map(folder => folder.name);
  }

  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    const folders = await this.getAllFolders();
    const newFolder: Folder = {
      ...folder,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    folders.push(newFolder);
    await fs.writeFile(dataPath, JSON.stringify(folders, null, 2));
    return newFolder;
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | null> {
    const folders = await this.getAllFolders();
    const index = folders.findIndex(folder => folder.id === id);
    if (index === -1) return null;
    
    folders[index] = { 
      ...folders[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    await fs.writeFile(dataPath, JSON.stringify(folders, null, 2));
    return folders[index];
  }

  async deleteFolder(id: string): Promise<boolean> {
    const folders = await this.getAllFolders();
    const filteredFolders = folders.filter(folder => folder.id !== id);
    if (filteredFolders.length === folders.length) return false;
    
    await fs.writeFile(dataPath, JSON.stringify(filteredFolders, null, 2));
    return true;
  }
}

export const foldersService = new FoldersService(); 