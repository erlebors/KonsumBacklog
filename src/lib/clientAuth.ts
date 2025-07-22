import { auth } from './firebase';

export async function createAuthenticatedRequest(
  url: string, 
  options: RequestInit = {}
): Promise<RequestInit> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    const token = await user.getIdToken();
    
    return {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };
  } catch (error) {
    console.error('Error creating authenticated request:', error);
    throw error;
  }
} 