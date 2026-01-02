import { NextRequest } from 'next/server'

/**
 * Agent Proxy Route
 *
 * This route proxies chat requests to the Pydantic AI agent backend.
 * It acts as a bridge between the Next.js frontend and the Python agent server.
 */

export const runtime = 'edge'
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
    const conversationId = typeof rawConversationId === 'string' && rawConversationId.trim()
      ? rawConversationId
      : 'default'

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

      // Handle specific status codes with structured Dutch/English messages
      if (response.status === 401) {
        return Response.json(
          {
            error_code: 'UNAUTHORIZED',
            message_nl: 'Sessie verlopen. Log opnieuw in.',
            message_en: 'Session expired. Please log in again.'
          },
          { status: 401 }
        )
      }

      if (response.status === 429) {
        return Response.json(
          {
            error_code: 'RATE_LIMIT',
            message_nl: 'Te veel verzoeken. Wacht even en probeer opnieuw.',
            message_en: 'Too many requests. Please wait and try again.',
            retry_after: 60
          },
          { status: 429 }
        )
      }

      if (response.status === 503 || response.status === 529) {
        return Response.json(
          {
            error_code: 'SERVICE_UNAVAILABLE',
            message_nl: 'Service tijdelijk niet beschikbaar. Probeer later opnieuw.',
            message_en: 'Service temporarily unavailable. Please try again later.'
          },
          { status: 503 }
        )
      }

      // Try to parse structured error from backend
      try {
        const errorData = JSON.parse(errorText)
        return Response.json(errorData, { status: response.status })
      } catch {
        return Response.json(
          {
            error_code: 'BACKEND_ERROR',
            message_nl: 'Er is een fout opgetreden bij de server.',
            message_en: 'A server error occurred.',
            details: errorText
          },
          { status: response.status }
        )
      }
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

    // Check for network errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isNetworkError = errorMessage.toLowerCase().includes('fetch') ||
                          errorMessage.toLowerCase().includes('network') ||
                          errorMessage.toLowerCase().includes('connection')

    if (isNetworkError) {
      return Response.json(
        {
          error_code: 'NETWORK_ERROR',
          message_nl: 'Kan geen verbinding maken met de server.',
          message_en: 'Cannot connect to server.',
          details: errorMessage
        },
        { status: 503 }
      )
    }

    return Response.json(
      {
        error_code: 'INTERNAL_ERROR',
        message_nl: 'Er is een onverwachte fout opgetreden.',
        message_en: 'An unexpected error occurred.',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
