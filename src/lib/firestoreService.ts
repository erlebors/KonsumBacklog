import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreTip {
  id?: string;
  userId: string;
  content: string;
  url: string;
  title?: string;
  relevanceDate: string | null;
  relevanceEvent: string | null;
  createdAt: Timestamp;
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

export interface FirestoreFolder {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  async addTip(userId: string, tip: Omit<FirestoreTip, 'id' | 'userId' | 'createdAt'>): Promise<FirestoreTip> {
    const tipsCollection = this.getTipsCollection(userId);
    const docRef = await addDoc(tipsCollection, {
      ...tip,
      userId,
      createdAt: serverTimestamp(),
    });
    
    return {
      ...tip,
      id: docRef.id,
      userId,
      createdAt: Timestamp.now(),
    };
  }

  async updateTip(userId: string, tipId: string, updates: Partial<FirestoreTip>): Promise<void> {
    const tipRef = doc(db, 'users', userId, 'tips', tipId);
    await updateDoc(tipRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteTip(userId: string, tipId: string): Promise<void> {
    const tipRef = doc(db, 'users', userId, 'tips', tipId);
    await deleteDoc(tipRef);
  }

  async getTip(userId: string, tipId: string): Promise<FirestoreTip | null> {
    const tipRef = doc(db, 'users', userId, 'tips', tipId);
    const tipSnap = await getDoc(tipRef);
    
    if (tipSnap.exists()) {
      return { id: tipSnap.id, ...tipSnap.data() } as FirestoreTip;
    }
    return null;
  }

  async getAllTips(userId: string): Promise<FirestoreTip[]> {
    const tipsCollection = this.getTipsCollection(userId);
    const q = query(tipsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreTip[];
  }

  // Real-time tips subscription
  subscribeToTips(userId: string, callback: (tips: FirestoreTip[]) => void) {
    const tipsCollection = this.getTipsCollection(userId);
    const q = query(tipsCollection, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const tips = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreTip[];
      callback(tips);
    });
  }

  // Folders methods
  async addFolder(userId: string, folder: Omit<FirestoreFolder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<FirestoreFolder> {
    const foldersCollection = this.getFoldersCollection(userId);
    const docRef = await addDoc(foldersCollection, {
      ...folder,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      ...folder,
      id: docRef.id,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  async updateFolder(userId: string, folderId: string, updates: Partial<FirestoreFolder>): Promise<void> {
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    await updateDoc(folderRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    await deleteDoc(folderRef);
  }

  async getFolder(userId: string, folderId: string): Promise<FirestoreFolder | null> {
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    const folderSnap = await getDoc(folderRef);
    
    if (folderSnap.exists()) {
      return { id: folderSnap.id, ...folderSnap.data() } as FirestoreFolder;
    }
    return null;
  }

  async getAllFolders(userId: string): Promise<FirestoreFolder[]> {
    const foldersCollection = this.getFoldersCollection(userId);
    const q = query(foldersCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreFolder[];
  }

  async getFolderNames(userId: string): Promise<string[]> {
    const folders = await this.getAllFolders(userId);
    return folders.map(folder => folder.name);
  }

  // Real-time folders subscription
  subscribeToFolders(userId: string, callback: (folders: FirestoreFolder[]) => void) {
    const foldersCollection = this.getFoldersCollection(userId);
    const q = query(foldersCollection, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const folders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreFolder[];
      callback(folders);
    });
  }

  // Get all available folder names (user folders + AI-generated from tips)
  async getAvailableFolderNames(userId: string): Promise<string[]> {
    const [userFolders, allTips] = await Promise.all([
      this.getAllFolders(userId),
      this.getAllTips(userId)
    ]);

    const userFolderNames = userFolders.map(folder => folder.name);
    const aiGeneratedFolders = new Set<string>();
    
    allTips.forEach(tip => {
      if (tip.folder && tip.folder.trim()) {
        aiGeneratedFolders.add(tip.folder.trim());
      }
    });

    const allFolderNames = [...new Set([...userFolderNames, ...Array.from(aiGeneratedFolders)])];
    allFolderNames.sort();
    
    return allFolderNames;
  }
}

export const firestoreService = new FirestoreService(); 