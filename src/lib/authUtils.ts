import { NextRequest } from 'next/server';

// Only import Firebase Admin if we're not in demo mode
let getAuth: any = null;
let initializeApp: any = null;
let getApps: any = null;
let cert: any = null;

export function isDemoMode(): boolean {
  // Check if we're in demo mode (no Firebase Admin config)
  return !process.env.FIREBASE_PROJECT_ID || 
         !process.env.FIREBASE_CLIENT_EMAIL || 
         !process.env.FIREBASE_PRIVATE_KEY;
}

// Only initialize Firebase Admin if we're not in demo mode
if (!isDemoMode()) {
  try {
    const firebaseAdmin = require('firebase-admin');
    getAuth = firebaseAdmin.getAuth;
    initializeApp = firebaseAdmin.initializeApp;
    getApps = firebaseAdmin.getApps;
    cert = firebaseAdmin.cert;
    
    // Initialize Firebase Admin if not already initialized
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
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