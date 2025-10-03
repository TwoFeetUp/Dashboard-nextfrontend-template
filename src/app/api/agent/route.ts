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

    // Extract the last message from the messages array if provided
    const message = body.messages
      ? body.messages[body.messages.length - 1].content
      : body.message

    if (!message) {
      return Response.json(
        { error: 'No message provided' },
        { status: 400 }
      )
    }

    // Forward request to agent backend
    const response = await fetch(`${agentUrl}/chat`, {
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
        conversation_id: body.conversation_id || 'default'
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

    const data = await response.json() as AgentResponse

    // Return in a format compatible with the chat interface
    return Response.json({
      role: 'assistant',
      content: data.response,
      conversation_id: data.conversation_id
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
