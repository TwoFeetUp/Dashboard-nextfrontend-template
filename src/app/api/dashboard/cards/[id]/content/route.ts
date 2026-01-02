import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AGENT_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/dashboard/cards/${id}/content?user_id=${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Convert snake_case from backend to camelCase for frontend
    return NextResponse.json({
      htmlContent: data.html_content,
      isStale: data.is_stale,
      isRefreshing: data.is_refreshing,
      generatedAt: data.generated_at,
      errorMessage: data.error_message,
    })
  } catch (error) {
    console.error('Failed to fetch card content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch card content' },
      { status: 500 }
    )
  }
}
