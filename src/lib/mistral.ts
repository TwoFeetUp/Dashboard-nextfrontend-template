import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * Configure Mistral AI provider using OpenAI-compatible interface
 * Mistral API is compatible with OpenAI's API structure
 */
export const mistral = createOpenAICompatible({
  baseURL: process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
  },
  name: 'mistral',
});

// Export pre-configured model
export const mistralMedium = mistral.chatModel('mistral-medium-latest');

// System prompts for different AI assistants
export const ASSISTANT_PROMPTS = {
  general: `You are a helpful AI assistant.
You provide clear, concise, and helpful responses to support staff and operations.
Be professional, friendly, and efficient in your communication.`,

  facilities: `You are the Facilities Management AI assistant.
You help with venue maintenance, scheduling, equipment management, and facility-related queries.
Provide practical solutions and prioritize safety and efficiency.`,

  events: `You are the Events Coordination AI assistant.
You assist with event planning, scheduling, logistics, and coordination.
Help staff manage events smoothly and provide insights on best practices.`,

  visitor: `You are the Visitor Services AI assistant.
You help with visitor inquiries, directions, amenities information, and general assistance.
Be welcoming, informative, and ensure visitors have a great experience.`,

  analytics: `You are the Analytics AI assistant.
You help analyze data, generate reports, and provide insights on operations.
Present data clearly and offer actionable recommendations.`,
};

// Helper function to get system prompt by type
export function getSystemPrompt(type: keyof typeof ASSISTANT_PROMPTS = 'general'): string {
  return ASSISTANT_PROMPTS[type] || ASSISTANT_PROMPTS.general;
}

// Mistral API configuration for direct API calls (if needed)
export const mistralConfig = {
  apiKey: process.env.MISTRAL_API_KEY || '',
  apiUrl: process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1',
  model: 'mistral-medium-latest',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2048,
  defaultTopP: 1,
};

// Types for Mistral conversations
export interface MistralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MistralStreamConfig {
  messages: MistralMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  instructions?: string;
  tools?: any[];
}