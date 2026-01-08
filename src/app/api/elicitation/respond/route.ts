import { NextRequest } from 'next/server'

/**
 * Elicitation Response Proxy Route
 *
 * This route proxies elicitation responses to the agent backend.
 * It ensures the correct backend URL is used server-side, avoiding
 * client-side environment variable issues.
 */

export const dynamic = 'force-dynamic'

interface ElicitationResponse {
  elicitation_id: string
  action: 'accept' | 'decline' | 'cancel'
  content?: Record<string, unknown> | null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ElicitationResponse

    // Get agent backend URL from environment (server-side)
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

    console.log('[Elicitation API] Proxying to:', `${agentUrl}/elicitation/respond`)

    // Forward request to agent backend
    const response = await fetch(`${agentUrl}/elicitation/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AGENT_API_KEY && {
          'Authorization': `Bearer ${process.env.AGENT_API_KEY}`
        })
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Elicitation API] Backend error:', response.status, errorText)
      return Response.json(
        { error: 'Backend error', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json(data)

  } catch (error) {
    console.error('[Elicitation API] Proxy error:', error)
    return Response.json(
      {
        error: 'Failed to communicate with backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
