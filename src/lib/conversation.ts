import pb from '@/lib/pocketbase';
import type { User } from '@/types/auth';

// Sanitize values for PocketBase filter queries to prevent injection
const sanitizeFilterValue = (value: string): string => {
  // Escape double quotes and backslashes for PocketBase filter syntax
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

// Conversation types
export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created: string;
  updated: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: string;
  metadata?: Record<string, any>;
  created: string;
  updated: string;
}

export interface CreateConversationData {
  userId: string;
  title?: string;
  metadata?: Record<string, any>;
}

export interface CreateMessageData {
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Conversation management functions
 */

// Get all conversations for a user
// Note: Backend rules already filter by userId, no client-side userId filter needed
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const records = await pb.collection('conversations').getFullList({
      sort: '-lastMessageAt',
    });
    
    return records.map(record => ({
      id: record.id,
      userId: record.userId,
      title: record.title,
      lastMessage: record.lastMessage,
      lastMessageAt: record.lastMessageAt,
      metadata: record.metadata,
      created: record.created,
      updated: record.updated,
    }));
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return [];
  }
}

// Get a single conversation
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const record = await pb.collection('conversations').getOne(conversationId);
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      lastMessage: record.lastMessage,
      lastMessageAt: record.lastMessageAt,
      metadata: record.metadata,
      created: record.created,
      updated: record.updated,
    };
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return null;
  }
}

// Create a new conversation
export async function createConversation(data: CreateConversationData): Promise<Conversation> {
  const conversationData = {
    ...data,
    title: data.title || 'New Conversation',
    lastMessage: '',
    lastMessageAt: new Date().toISOString(),
  };
  
  const record = await pb.collection('conversations').create(conversationData);
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    lastMessage: record.lastMessage,
    lastMessageAt: record.lastMessageAt,
    metadata: record.metadata,
    created: record.created,
    updated: record.updated,
  };
}

// Delete a conversation
export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    // Delete related messages first to avoid required relation constraints
    const safeConversationId = sanitizeFilterValue(conversationId);
    const messages = await pb.collection('messages').getFullList({
      filter: `conversationId = "${safeConversationId}"`,
    });

    for (const message of messages) {
      await pb.collection('messages').delete(message.id);
    }

    await pb.collection('conversations').delete(conversationId);

    return true;
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
}

// Get messages for a conversation
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const safeConversationId = sanitizeFilterValue(conversationId);
    const records = await pb.collection('messages').getFullList({
      filter: `conversationId = "${safeConversationId}"`,
      // Remove sort since messages collection doesn't have created field
    });
    
    return records.map(record => ({
      id: record.id,
      conversationId: record.conversationId,
      userId: record.userId,
      role: record.role,
      content: record.content,
      metadata: record.metadata,
      created: record.created,
      updated: record.updated,
    }));
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return [];
  }
}

// Create a new message
export async function createMessage(data: CreateMessageData): Promise<Message> {
  const record = await pb.collection('messages').create(data);
  
  // Update conversation's last message
  await pb.collection('conversations').update(data.conversationId, {
    lastMessage: data.content.substring(0, 100), // Store first 100 chars
    lastMessageAt: new Date().toISOString(),
  });
  
  return {
    id: record.id,
    conversationId: record.conversationId,
    userId: record.userId,
    role: record.role,
    content: record.content,
    metadata: record.metadata,
    created: record.created,
    updated: record.updated,
  };
}

// Subscribe to real-time messages for a conversation
export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
): () => void {
  // Subscribe to new messages
  pb.collection('messages').subscribe('*', (e) => {
    if (e.action === 'create' && e.record.conversationId === conversationId) {
      callback({
        id: e.record.id,
        conversationId: e.record.conversationId,
        userId: e.record.userId,
        role: e.record.role,
        content: e.record.content,
        metadata: e.record.metadata,
        created: e.record.created,
        updated: e.record.updated,
      });
    }
  });
  
  // Return unsubscribe function
  return () => {
    pb.collection('messages').unsubscribe('*');
  };
}

// Update conversation title
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<Conversation> {
  const record = await pb.collection('conversations').update(conversationId, {
    title,
  });
  
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    lastMessage: record.lastMessage,
    lastMessageAt: record.lastMessageAt,
    metadata: record.metadata,
    created: record.created,
    updated: record.updated,
  };
}

// Search conversations
// Note: Backend rules already filter by userId, no client-side userId filter needed
export async function searchConversations(
  userId: string,
  query: string
): Promise<Conversation[]> {
  try {
    const safeQuery = sanitizeFilterValue(query);
    const records = await pb.collection('conversations').getFullList({
      filter: `title ~ "${safeQuery}" || lastMessage ~ "${safeQuery}"`,
      sort: '-lastMessageAt',
    });
    
    return records.map(record => ({
      id: record.id,
      userId: record.userId,
      title: record.title,
      lastMessage: record.lastMessage,
      lastMessageAt: record.lastMessageAt,
      metadata: record.metadata,
      created: record.created,
      updated: record.updated,
    }));
  } catch (error) {
    console.error('Failed to search conversations:', error);
    return [];
  }
}