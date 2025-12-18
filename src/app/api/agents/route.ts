import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

  const response = await fetch(`${agentUrl}/agents`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.AGENT_API_KEY && {
        Authorization: `Bearer ${process.env.AGENT_API_KEY}`
      })
    }
  })

  if (!response.ok) {
    const text = await response.text()
    return Response.json(
      { error: 'Agent backend error', details: text },
      { status: response.status }
    )
  }

  const json = await response.json()
  return Response.json(json)
}

