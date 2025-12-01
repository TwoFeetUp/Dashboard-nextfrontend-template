import { NextRequest } from 'next/server'

/**
 * Agent Proxy Route
 *
 * This route proxies chat requests to the Pydantic AI agent backend.
 * It acts as a bridge between the Next.js frontend and the Python agent server.
 */

// Note: Using Node.js runtime (not Edge) to allow localhost connections in dev
export const dynamic = 'force-dynamic'

interface AgentRequest {
  message: string
  conversation_id?: string
  conversationId?: string
  messages?: Array<{ role: string; content: string }>
}

interface AgentResponse {
  response: string
  conversation_id: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AgentRequest

    // Get agent backend URL from environment
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

    // Extract the last message, conversation id and assistantType
    const message = body.messages
      ? body.messages[body.messages.length - 1]?.content
      : body.message

    const assistantType = (body as any).assistantType
    const rawConversationId = (body as any).conversation_id ?? (body as any).conversationId
    // No "default" fallback - this was causing polluted history to be loaded
    const conversationId = typeof rawConversationId === 'string' && rawConversationId.trim()
      ? rawConversationId
      : undefined

    if (!message) {
      return Response.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    // Forward request to agent backend STREAMING endpoint
    const response = await fetch(`${agentUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if AGENT_API_KEY is set
        ...(process.env.AGENT_API_KEY && {
          'Authorization': `Bearer ${process.env.AGENT_API_KEY}`
        })
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        agent: assistantType // Pass the agent type for routing
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Agent backend error:', errorText)
      return Response.json(
        { error: 'Agent backend error', details: errorText },
        { status: response.status }
      )
    }

    // Stream the response back to the frontend
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Agent proxy error:', error)
    return Response.json(
      {
        error: 'Failed to communicate with agent backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
