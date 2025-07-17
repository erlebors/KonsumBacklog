import { NextRequest } from 'next/server';
import { tipsService } from '@/lib/tipsService';
import { foldersService } from '@/lib/foldersService';

// Only import Firebase Admin if we're not in demo mode
let getAuth: any = null;
let initializeApp: any = null;
let getApps: any = null;
let cert: any = null;
let firebaseAdminInitialized = false;

export function isDemoMode(): boolean {
  // Check if we're in demo mode (no Firebase Admin config or initialization failed)
  return !process.env.FIREBASE_PROJECT_ID || 
         !process.env.FIREBASE_CLIENT_EMAIL || 
         !process.env.FIREBASE_PRIVATE_KEY ||
         !firebaseAdminInitialized;
}

// Function to clear demo data to prevent mixing with authenticated data
async function clearDemoData() {
  try {
    console.log('Clearing demo data to prevent mixing with authenticated data...');
    // Clear tips
    const tips = await tipsService.getAllTips();
    for (const tip of tips) {
      await tipsService.deleteTip(tip.id);
    }
    // Clear folders
    const folders = await foldersService.getAllFolders();
    for (const folder of folders) {
      await foldersService.deleteFolder(folder.id);
    }
    console.log('Demo data cleared successfully');
  } catch (error) {
    console.error('Error clearing demo data:', error);
  }
}

// Only initialize Firebase Admin if we're not in demo mode
if (process.env.FIREBASE_PROJECT_ID && 
    process.env.FIREBASE_CLIENT_EMAIL && 
    process.env.FIREBASE_PRIVATE_KEY) {
  try {
    // Import Firebase Admin using require
    const firebaseAdmin = require('firebase-admin');
    
    // Check if Firebase Admin is properly imported
    if (!firebaseAdmin.getAuth || !firebaseAdmin.initializeApp || !firebaseAdmin.getApps || !firebaseAdmin.cert) {
      console.error('Firebase Admin functions not available:', {
        getAuth: !!firebaseAdmin.getAuth,
        initializeApp: !!firebaseAdmin.initializeApp,
        getApps: !!firebaseAdmin.getApps,
        cert: !!firebaseAdmin.cert
      });
      throw new Error('Firebase Admin SDK not properly imported');
    }
    
    getAuth = firebaseAdmin.getAuth;
    initializeApp = firebaseAdmin.initializeApp;
    getApps = firebaseAdmin.getApps;
    cert = firebaseAdmin.cert;
    
    // Initialize Firebase Admin if not already initialized
    const apps = getApps();
    console.log('Current Firebase apps:', apps);
    if (!apps || apps.length === 0) {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase app initialized:', app.name);
    }
    
    // Mark as successfully initialized
    firebaseAdminInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    firebaseAdminInitialized = false;
    // Clear demo data when Firebase Admin fails to prevent mixing
    clearDemoData();
  }
}

export async function getCurrentUser(request: NextRequest): Promise<string | null> {
  try {
    // If we're in demo mode or Firebase Admin isn't available, return null
    if (isDemoMode() || !getAuth) {
      return null;
    }

    // Get the Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return null;
    }

    // Verify the token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
} 