import { NextResponse } from "next/server"
import { changeMemberMembership } from "@/lib/facturatie/service"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params
  try {
    const payload = await request.json()
    const { membershipId } = payload
    if (!membershipId) {
      return NextResponse.json({ error: "membershipId is verplicht" }, { status: 400 })
    }

    const member = await changeMemberMembership(id, {
      membershipId,
      membershipCustomName: payload.membershipCustomName,
      customAmount:
        payload.customAmount !== undefined && payload.customAmount !== null
          ? Number(payload.customAmount)
          : undefined,
      billingCycle: payload.billingCycle,
    })

    return NextResponse.json(member)
  } catch (error: any) {
    console.error(`Failed to change membership for ${id}`, error)
    const status = error?.status ?? 500
    const message = error?.message || "Kon lidmaatschap niet wijzigen"
    return NextResponse.json({ error: message }, { status })
  }
}

