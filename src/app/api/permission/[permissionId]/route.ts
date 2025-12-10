import { NextRequest } from 'next/server'

/**
 * Permission Proxy Route
 *
 * This route proxies permission approval/denial requests to the Pydantic AI agent backend.
 * The frontend calls this endpoint when the user clicks approve/deny on a tool permission dialog.
 */

export const dynamic = 'force-dynamic'

interface PermissionRequest {
  approved: boolean
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  try {
    const { permissionId } = await params
    const body = await req.json() as PermissionRequest

    // Get agent backend URL from environment
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

    // Forward request to agent backend
    const response = await fetch(`${agentUrl}/api/permission/${permissionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if AGENT_API_KEY is set
        ...(process.env.AGENT_API_KEY && {
          'Authorization': `Bearer ${process.env.AGENT_API_KEY}`
        })
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Permission backend error:', errorText)
      return Response.json(
        { error: 'Permission backend error', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return Response.json(result)

  } catch (error) {
    console.error('Permission proxy error:', error)
    return Response.json(
      {
        error: 'Failed to communicate with agent backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ permissionId: string }> }
) {
  try {
    const { permissionId } = await params

    // Get agent backend URL from environment
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

    // Forward request to agent backend
    const response = await fetch(`${agentUrl}/api/permission/${permissionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.AGENT_API_KEY && {
          'Authorization': `Bearer ${process.env.AGENT_API_KEY}`
        })
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Permission backend error:', errorText)
      return Response.json(
        { error: 'Permission backend error', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return Response.json(result)

  } catch (error) {
    console.error('Permission proxy error:', error)
    return Response.json(
      {
        error: 'Failed to communicate with agent backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
