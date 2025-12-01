import PocketBase from 'pocketbase';

// Create and configure PocketBase client instance
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

// Type definitions for User model
export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  avatar?: string;
  verified: boolean;
  created: string;
  updated: string;
  emailVisibility?: boolean;
}

// Type definitions for Auth Record
export interface AuthRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  username?: string;
  email?: string;
  emailVisibility?: boolean;
  verified?: boolean;
  name?: string;
  avatar?: string;
  [key: string]: any;
}

// Configure auto-cancellation for redundant requests
pb.autoCancellation(false);

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return pb.authStore.isValid;
};

// Helper function to get current user
export const getCurrentUser = (): AuthRecord | null => {
  if (!isAuthenticated()) return null;
  return pb.authStore.model as AuthRecord;
};

// Helper function to clear auth store
export const clearAuthStore = (): void => {
  pb.authStore.clear();
};

// Subscribe to auth store changes
export const subscribeToAuthChanges = (
  callback: (token: string, model: any) => void
): (() => void) => {
  return pb.authStore.onChange((token, record) => {
    // Map PocketBase's record to our AuthRecord type
    const authRecord: AuthRecord | null = record ? {
      ...record,
      id: record.id,
      collectionId: record.collectionId,
      collectionName: record.collectionName,
      created: record.created,
      updated: record.updated,
      username: record.username,
      email: record.email,
      emailVisibility: record.emailVisibility,
      verified: record.verified,
      name: record.name,
      avatar: record.avatar
    } : null;
    
    callback(token, authRecord);
  });
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    username?: string;
  }
): Promise<AuthRecord> => {
  const record = await pb.collection('users').update(userId, data);
  return record as AuthRecord;
};

export default pb;