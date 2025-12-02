import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { promises as fs } from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Create Mistral provider using OpenAI-compatible endpoint
const mistral = createOpenAICompatible({
  name: 'mistral',
  baseURL: 'https://api.mistral.ai/v1',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
  },
});

// Initialize PocketBase client (optional - for saving messages)
// Default to production URL for Railway deployments where env vars may not be available at build time
const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://pocketbase-lht.up.railway.app'
);

// Function to load system prompt from markdown file
async function loadSystemPrompt(assistantType: string): Promise<string> {
  try {
    const promptPath = path.join(process.cwd(), 'src', 'prompts', `${assistantType}.md`);
    const promptContent = await fs.readFile(promptPath, 'utf-8');
    return promptContent;
  } catch (error) {
    console.warn(`Failed to load prompt for ${assistantType}, using default`);
    // Fallback to default prompt if file doesn't exist
    return getDefaultPrompt(assistantType);
  }
}

// Fallback prompts in case markdown files are not available
function getDefaultPrompt(assistantType: string): string {
  const defaultPrompts: Record<string, string> = {
    general: 'Je bent een behulpzame AI-assistent. Je helpt medewerkers met algemene vragen en taken.',
    'henry-hr': 'Je bent Henry HR, een AI-assistent die teamleden begeleidt bij het maken van hun eigen Custom GPT. Je helpt stap-voor-stap met het definiëren van doelen, schrijven van instructies, en configureren van GPT-instellingen.',
    'perry-prompt': 'Je bent Perry Prompt, een AI collega gespecialiseerd in het optimaliseren van AI-interacties. Je helpt met het schrijven en verbeteren van prompts, en deelt best practices voor effectief prompten.',
    'corry-content': 'Je bent Corry Content, een AI-assistent die ruwe teksten transformeert in platform-specifieke content. Je helpt met het maken van social media posts, marketing content, en het aanpassen van teksten voor verschillende platforms.',
    'kenny-kennis': 'Je bent Kenny Kennis, een AI-assistent die ruwe informatie transformeert in AI-interpreteerbare knowledge files. Je helpt met het structureren van informatie uit transcripties, bronnen en input tot georganiseerde kennisbestanden.',
  };

  return defaultPrompts[assistantType] || defaultPrompts.general;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const assistantType = body.assistantType || 'general';
    const conversationId = body.conversationId;
    const userId = body.userId;

    // Ensure messages is an array
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load system prompt from markdown file
    const systemPrompt = await loadSystemPrompt(assistantType);
    
    // Filter out any empty messages
    const filteredMessages = messages.filter((msg: any) => msg.content && msg.content.trim() !== '');

    // Optional: Save messages to PocketBase (non-blocking)
    // This is commented out since PocketBase saving is handled client-side
    // and requires proper authentication which is not set up in the API route

    const result = streamText({
      model: mistral.chatModel('mistral-medium-latest'),
      system: systemPrompt,
      messages: filteredMessages,
      temperature: 0.7,
      onFinish: async ({ text }) => {
        // Optional: Could save to PocketBase here if needed
        // Currently handled client-side for better auth management
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('API key')) {
      return new Response(
        JSON.stringify({ error: 'API key configuration error. Please check your Mistral API key.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message?.includes('rate limit')) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}