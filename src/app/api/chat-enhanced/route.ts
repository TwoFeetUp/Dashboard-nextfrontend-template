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
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090');

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
    general: 'Je bent een behulpzame AI-assistent voor het Olympisch Stadion Amsterdam. Je helpt medewerkers met algemene vragen en taken.',
    'contract-clearance': 'Je bent een gespecialiseerde AI-assistent voor contractbeheer en -controle bij het Olympisch Stadion. Je helpt met het controleren van contracten, het identificeren van belangrijke clausules, en het adviseren over contractuele verplichtingen.',
    'event-planner': 'Je bent een event planning AI-assistent voor het Olympisch Stadion. Je helpt met het plannen en organiseren van evenementen, inclusief capaciteitsplanning, faciliteiten, catering, en logistiek.',
    'event-contract-assistant': 'Je bent een AI-assistent gespecialiseerd in het opstellen van event contracten voor het Olympisch Stadion. Je helpt met het maken van complete contracten met alle juridische aspecten, technische eisen, en financiële afspraken.',
    'marketing-communicatie': 'Je bent een marketing en communicatie AI-assistent voor het Olympisch Stadion. Je helpt met het ontwikkelen van marketingstrategieën, het creëren van content voor social media, persberichten, en promotioneel materiaal.',
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