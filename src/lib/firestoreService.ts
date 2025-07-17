import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tip } from '@/lib/tipsService';
import { Folder } from '@/lib/foldersService';

export interface FirestoreTip extends Omit<Tip, 'id'> {
  userId: string;
}

export interface FirestoreFolder extends Omit<Folder, 'id'> {
  userId: string;
}

class FirestoreService {
  // Tips collection
  private getTipsCollection(userId: string) {
    return collection(db, 'users', userId, 'tips');
  }

  // Folders collection
  private getFoldersCollection(userId: string) {
    return collection(db, 'users', userId, 'folders');
  }

  // Tips methods
  async getAllTips(userId: string): Promise<Tip[]> {
    try {
      const tipsQuery = query(
        this.getTipsCollection(userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(tipsQuery);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Tip[];
    } catch (error) {
      console.error('Error fetching tips from Firestore:', error);
      return [];
    }
  }

  async addTip(userId: string, tip: Omit<Tip, 'id'>): Promise<Tip> {
    try {
      const docRef = await addDoc(this.getTipsCollection(userId), {
        ...tip,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        ...tip,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error adding tip to Firestore:', error);
      throw error;
    }
  }

  async updateTip(userId: string, tipId: string, updates: Partial<Tip>): Promise<Tip | null> {
    try {
      const tipRef = doc(this.getTipsCollection(userId), tipId);
      const tipDoc = await getDoc(tipRef);
      
      if (!tipDoc.exists()) {
        return null;
      }

      await updateDoc(tipRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return {
        ...tipDoc.data(),
        ...updates,
        id: tipId
      } as Tip;
    } catch (error) {
      console.error('Error updating tip in Firestore:', error);
      throw error;
    }
  }

  async deleteTip(userId: string, tipId: string): Promise<boolean> {
    try {
      const tipRef = doc(this.getTipsCollection(userId), tipId);
      await deleteDoc(tipRef);
      return true;
    } catch (error) {
      console.error('Error deleting tip from Firestore:', error);
      return false;
    }
  }

  async getTip(userId: string, tipId: string): Promise<Tip | null> {
    try {
      const tipRef = doc(this.getTipsCollection(userId), tipId);
      const tipDoc = await getDoc(tipRef);
      
      if (!tipDoc.exists()) {
        return null;
      }

      return {
        ...tipDoc.data(),
        id: tipId
      } as Tip;
    } catch (error) {
      console.error('Error fetching tip from Firestore:', error);
      return null;
    }
  }

  // Folders methods
  async getAllFolders(userId: string): Promise<Folder[]> {
    try {
      const foldersQuery = query(
        this.getFoldersCollection(userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(foldersQuery);
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Folder[];
    } catch (error) {
      console.error('Error fetching folders from Firestore:', error);
      return [];
    }
  }

  async addFolder(userId: string, folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    try {
      const docRef = await addDoc(this.getFoldersCollection(userId), {
        ...folder,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        ...folder,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding folder to Firestore:', error);
      throw error;
    }
  }

  async updateFolder(userId: string, folderId: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>): Promise<Folder | null> {
    try {
      const folderRef = doc(this.getFoldersCollection(userId), folderId);
      const folderDoc = await getDoc(folderRef);
      
      if (!folderDoc.exists()) {
        return null;
      }

      await updateDoc(folderRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return {
        ...folderDoc.data(),
        ...updates,
        id: folderId
      } as Folder;
    } catch (error) {
      console.error('Error updating folder in Firestore:', error);
      throw error;
    }
  }

  async deleteFolder(userId: string, folderId: string): Promise<boolean> {
    try {
      const folderRef = doc(this.getFoldersCollection(userId), folderId);
      await deleteDoc(folderRef);
      return true;
    } catch (error) {
      console.error('Error deleting folder from Firestore:', error);
      return false;
    }
  }

  async getFolder(userId: string, folderId: string): Promise<Folder | null> {
    try {
      const folderRef = doc(this.getFoldersCollection(userId), folderId);
      const folderDoc = await getDoc(folderRef);
      
      if (!folderDoc.exists()) {
        return null;
      }

      return {
        ...folderDoc.data(),
        id: folderId
      } as Folder;
    } catch (error) {
      console.error('Error fetching folder from Firestore:', error);
      return null;
    }
  }

  async getFolderNames(userId: string): Promise<string[]> {
    try {
      const folders = await this.getAllFolders(userId);
      return folders.map(folder => folder.name);
    } catch (error) {
      console.error('Error fetching folder names from Firestore:', error);
      return [];
    }
  }

  // Utility methods
  async getAvailableFolders(userId: string): Promise<{
    folders: string[];
    userFolders: string[];
    aiGeneratedFolders: string[];
  }> {
    try {
      // Get user-created folders
      const userFolders = await this.getAllFolders(userId);
      const userFolderNames = userFolders.map(folder => folder.name);

      // Get AI-generated folders from existing tips
      const allTips = await this.getAllTips(userId);
      const aiGeneratedFolders = new Set<string>();
      
      allTips.forEach(tip => {
        if (tip.folder && tip.folder.trim()) {
          aiGeneratedFolders.add(tip.folder.trim());
        }
      });

      // Combine and deduplicate folder names
      const allFolderNames = [...new Set([...userFolderNames, ...Array.from(aiGeneratedFolders)])];
      
      // Sort alphabetically
      allFolderNames.sort();

      return {
        folders: allFolderNames,
        userFolders: userFolderNames,
        aiGeneratedFolders: Array.from(aiGeneratedFolders)
      };
    } catch (error) {
      console.error('Error fetching available folders from Firestore:', error);
      return {
        folders: [],
        userFolders: [],
        aiGeneratedFolders: []
      };
    }
  }
}

// Export a singleton instance
export const firestoreService = new FirestoreService(); 