import { NextResponse } from "next/server"
import { deleteMember, updateMember } from "@/lib/facturatie/service"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params
  try {
    const payload = await request.json()
    const member = await updateMember(id, payload)
    return NextResponse.json(member)
  } catch (error: any) {
    console.error(`Failed to update member ${id}`, error)
    const status = error?.status ?? 500
    const message = error?.message || "Kon lid niet bijwerken"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  try {
    await deleteMember(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`Failed to delete member ${id}`, error)
    const status = error?.status ?? 500
    const message = error?.message || "Kon lid niet verwijderen"
    return NextResponse.json({ error: message }, { status })
  }
}
