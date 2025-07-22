import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

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

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

class FirestoreService {
  private getTipsCollection(userId: string) {
    return collection(db, 'users', userId, 'tips');
  }

  private getFoldersCollection(userId: string) {
    return collection(db, 'users', userId, 'folders');
  }

  // Convert Firestore document to Tip interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docToTip(doc: any): Tip {
    const data = doc.data();
    return {
      id: doc.id,
      content: data?.content || '',
      url: data?.url || '',
      title: data?.title || '',
      relevanceDate: data?.relevanceDate || null,
      relevanceEvent: data?.relevanceEvent || null,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt || new Date().toISOString(),
      folder: data?.folder || 'General Tips',
      priority: data?.priority || '5',
      summary: data?.summary || '',
      tags: data?.tags || [],
      actionRequired: data?.actionRequired || false,
      estimatedTime: data?.estimatedTime || '',
      isProcessed: data?.isProcessed || false,
      aiProcessed: data?.aiProcessed || false,
      aiError: data?.aiError || '',
      userContext: data?.userContext || '',
      needsMoreInfo: data?.needsMoreInfo || false,
      urgencyLevel: data?.urgencyLevel || 'medium'
    };
  }

  // Convert Tip interface to Firestore document
  private tipToDoc(tip: Omit<Tip, 'id'>) {
    return {
      content: tip.content,
      url: tip.url,
      title: tip.title || '',
      relevanceDate: tip.relevanceDate,
      relevanceEvent: tip.relevanceEvent,
      createdAt: tip.createdAt ? new Date(tip.createdAt) : serverTimestamp(),
      folder: tip.folder || 'General Tips',
      priority: tip.priority || '5',
      summary: tip.summary || '',
      tags: tip.tags || [],
      actionRequired: tip.actionRequired || false,
      estimatedTime: tip.estimatedTime || '',
      isProcessed: tip.isProcessed || false,
      aiProcessed: tip.aiProcessed || false,
      aiError: tip.aiError || '',
      userContext: tip.userContext || '',
      needsMoreInfo: tip.needsMoreInfo || false,
      urgencyLevel: tip.urgencyLevel || 'medium'
    };
  }

  // Convert Firestore document to Folder interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private docToFolder(doc: any): Folder {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      description: data.description || '',
      color: data.color || '#3B82F6',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString()
    };
  }

  // Convert Folder interface to Firestore document
  private folderToDoc(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) {
    return {
      name: folder.name,
      description: folder.description || '',
      color: folder.color || '#3B82F6',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  // Get all tips for a user
  async getAllTips(userId: string): Promise<Tip[]> {
    try {
      const tipsCollection = this.getTipsCollection(userId);
      const q = query(tipsCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.docToTip(doc));
    } catch (error) {
      console.error('Error getting tips:', error);
      throw error;
    }
  }

  // Add a new tip
  async addTip(userId: string, tip: Omit<Tip, 'id'>): Promise<Tip> {
    try {
      const tipsCollection = this.getTipsCollection(userId);
      const docData = this.tipToDoc(tip);
      const docRef = await addDoc(tipsCollection, docData);
      
      return {
        ...tip,
        id: docRef.id,
        createdAt: docData.createdAt instanceof Timestamp 
          ? docData.createdAt.toDate().toISOString() 
          : tip.createdAt
      };
    } catch (error) {
      console.error('Error adding tip:', error);
      throw error;
    }
  }

  // Update a tip
  async updateTip(userId: string, tipId: string, updates: Partial<Tip>): Promise<void> {
    try {
      const tipRef = doc(this.getTipsCollection(userId), tipId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      
      // Only include fields that are being updated
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && updates[key as keyof Tip] !== undefined) {
          updateData[key] = updates[key as keyof Tip];
        }
      });
      
      await updateDoc(tipRef, updateData);
    } catch (error) {
      console.error('Error updating tip:', error);
      throw error;
    }
  }

  // Delete a tip
  async deleteTip(userId: string, tipId: string): Promise<void> {
    try {
      const tipRef = doc(this.getTipsCollection(userId), tipId);
      await deleteDoc(tipRef);
    } catch (error) {
      console.error('Error deleting tip:', error);
      throw error;
    }
  }

  // Get all folders for a user
  async getAllFolders(userId: string): Promise<Folder[]> {
    try {
      const foldersCollection = this.getFoldersCollection(userId);
      const q = query(foldersCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.docToFolder(doc));
    } catch (error) {
      console.error('Error getting folders:', error);
      throw error;
    }
  }

  // Add a new folder
  async addFolder(userId: string, folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    try {
      const foldersCollection = this.getFoldersCollection(userId);
      const docData = this.folderToDoc(folder);
      const docRef = await addDoc(foldersCollection, docData);
      
      return {
        ...folder,
        id: docRef.id,
        createdAt: docData.createdAt instanceof Timestamp 
          ? docData.createdAt.toDate().toISOString() 
          : new Date().toISOString(),
        updatedAt: docData.updatedAt instanceof Timestamp 
          ? docData.updatedAt.toDate().toISOString() 
          : new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding folder:', error);
      throw error;
    }
  }

  // Update a folder
  async updateFolder(userId: string, folderId: string, updates: Partial<Folder>): Promise<Folder | null> {
    try {
      const folderRef = doc(this.getFoldersCollection(userId), folderId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      // Remove id from updates
      delete updateData.id;
      
      await updateDoc(folderRef, updateData);
      
      // Return the updated folder
      const updatedDoc = await getDocs(query(this.getFoldersCollection(userId), where('__name__', '==', folderId)));
      if (updatedDoc.empty) return null;
      
      return this.docToFolder(updatedDoc.docs[0]);
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  // Delete a folder
  async deleteFolder(userId: string, folderId: string): Promise<boolean> {
    try {
      const folderRef = doc(this.getFoldersCollection(userId), folderId);
      await deleteDoc(folderRef);
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // Get folder names for a user
  async getFolderNames(userId: string): Promise<string[]> {
    try {
      const foldersCollection = this.getFoldersCollection(userId);
      const querySnapshot = await getDocs(foldersCollection);
      
      return querySnapshot.docs.map(doc => doc.data().name).filter(Boolean);
    } catch (error) {
      console.error('Error getting folder names:', error);
      return [];
    }
  }

  // Get available folders with additional information
  async getAvailableFolders(userId: string): Promise<{
    folders: Folder[];
    userFolders: string[];
    aiGeneratedFolders: string[];
  }> {
    try {
      const folders = await this.getAllFolders(userId);
      const userFolders = folders.map(folder => folder.name);
      
      // Get unique folder names from tips (AI-generated folders)
      const tips = await this.getAllTips(userId);
      const tipFolders = [...new Set(tips.map(tip => tip.folder).filter((folder): folder is string => Boolean(folder)))];
      const aiGeneratedFolders = tipFolders.filter(folder => !userFolders.includes(folder));
      
      return {
        folders,
        userFolders,
        aiGeneratedFolders
      };
    } catch (error) {
      console.error('Error getting available folders:', error);
      throw error;
    }
  }

  // Create test data
  async createTestData(userId: string): Promise<Tip[]> {
    const testTips: Omit<Tip, 'id'>[] = [
      {
        content: "Learn React Server Components for better performance",
        url: "https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023",
        title: "React Server Components Guide",
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: "Programming",
        priority: "8",
        summary: "• React Server Components improve app performance\n• Reduces client-side JavaScript bundle size\n• Enables better SEO and faster initial page loads",
        tags: ["react", "performance", "frontend"],
        actionRequired: true,
        estimatedTime: "2 hours",
        isProcessed: false,
        aiProcessed: true,
        urgencyLevel: "high"
      },
      {
        content: "Implement dark mode toggle in the app",
        url: "",
        title: "Dark Mode Implementation",
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: "UI/UX",
        priority: "6",
        summary: "• Add dark mode toggle to navigation\n• Create dark theme color palette\n• Test accessibility in both themes",
        tags: ["ui", "dark-mode", "accessibility"],
        actionRequired: false,
        estimatedTime: "4 hours",
        isProcessed: false,
        aiProcessed: false,
        urgencyLevel: "medium"
      },
      {
        content: "Review TypeScript best practices for the project",
        url: "https://www.typescriptlang.org/docs/handbook/intro.html",
        title: "TypeScript Best Practices",
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: "Programming",
        priority: "7",
        summary: "• Use strict type checking\n• Implement proper interfaces\n• Avoid any type usage",
        tags: ["typescript", "best-practices", "code-quality"],
        actionRequired: true,
        estimatedTime: "3 hours",
        isProcessed: false,
        aiProcessed: true,
        urgencyLevel: "medium"
      },
      {
        content: "Plan user authentication flow",
        url: "",
        title: "Authentication System Design",
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: "Architecture",
        priority: "9",
        summary: "• Design secure login/logout flow\n• Implement JWT token management\n• Add password reset functionality",
        tags: ["auth", "security", "architecture"],
        actionRequired: true,
        estimatedTime: "8 hours",
        isProcessed: false,
        aiProcessed: false,
        urgencyLevel: "high"
      },
      {
        content: "Optimize database queries for better performance",
        url: "",
        title: "Database Optimization",
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: "Backend",
        priority: "5",
        summary: "• Analyze slow query patterns\n• Add proper database indexes\n• Implement query caching",
        tags: ["database", "performance", "optimization"],
        actionRequired: false,
        estimatedTime: "6 hours",
        isProcessed: false,
        aiProcessed: false,
        urgencyLevel: "low"
      }
    ];

    const createdTips: Tip[] = [];
    
    for (const testTip of testTips) {
      try {
        const createdTip = await this.addTip(userId, testTip);
        createdTips.push(createdTip);
      } catch (error) {
        console.error('Error creating test tip:', error);
      }
    }

    return createdTips;
  }

  // Clear all test data
  async clearTestData(userId: string): Promise<void> {
    try {
      const tipsCollection = this.getTipsCollection(userId);
      const querySnapshot = await getDocs(tipsCollection);
      
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing test data:', error);
      throw error;
    }
  }

  // Test Firestore connection
  async testConnection(): Promise<boolean> {
    try {
      // Try to access Firestore
      const testCollection = collection(db, 'test');
      await getDocs(testCollection);
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return false;
    }
  }
}

export const firestoreService = new FirestoreService(); 