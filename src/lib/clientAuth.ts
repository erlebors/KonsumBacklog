import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';

export async function getAuthToken(): Promise<string | null> {
  try {
    // Check if Firebase is properly configured
    if (!auth) {
      console.warn('Firebase auth not available');
      return null;
    }

    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export function getCurrentUser(): User | null {
  try {
    // Check if Firebase is properly configured
    if (!auth) {
      return null;
    }
    return auth.currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function createAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<RequestInit> {
  try {
    const token = await getAuthToken();
    
    return {
      ...options,
      headers: {
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };
  } catch (error) {
    console.error('Error creating authenticated request:', error);
    // Return the original options without auth header if there's an error
    return options;
  }
} 