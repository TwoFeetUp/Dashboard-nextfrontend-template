import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.AGENT_BACKEND_URL || 'http://localhost:8000'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const inputConfig = body.config || body // Support both { config: {...} } and flat object

    // Convert camelCase to snake_case for backend
    const config = {
      title: inputConfig.title,
      research_topic: inputConfig.researchTopic,
      refresh_frequency: inputConfig.refreshFrequency,
      custom_refresh_hours: inputConfig.customRefreshHours,
      position: inputConfig.position,
      is_active: inputConfig.isActive,
    }

    // Backend expects { config: DashboardCardConfig }
    const response = await fetch(`${BACKEND_URL}/dashboard/cards/${id}?user_id=${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update dashboard card:', error)
    return NextResponse.json(
      { error: 'Failed to update dashboard card' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/dashboard/cards/${id}?user_id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to delete dashboard card:', error)
    return NextResponse.json(
      { error: 'Failed to delete dashboard card' },
      { status: 500 }
    )
  }
}
