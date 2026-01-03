import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AGENT_BACKEND_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = request.nextUrl.searchParams.get('userId')
  const mode = request.nextUrl.searchParams.get('mode') || 'full'

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/dashboard/cards/${id}/refresh?user_id=${userId}&mode=${mode}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to refresh card:', error)
    return NextResponse.json(
      { error: 'Failed to refresh card' },
      { status: 500 }
    )
  }
}
