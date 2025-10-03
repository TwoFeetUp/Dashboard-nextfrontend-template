import { NextResponse } from "next/server"
import { createMember, listMembers } from "@/lib/facturatie/service"

export async function GET() {
  try {
    const members = await listMembers()
    return NextResponse.json(members)
  } catch (error: any) {
    console.error("Failed to list members", error)
    return NextResponse.json({ error: "Kon leden niet ophalen" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { firstName, lastName, email, membershipId } = payload
    if (!firstName || !lastName || !email || !membershipId) {
      return NextResponse.json({ error: "firstName, lastName, email en membershipId zijn verplicht" }, { status: 400 })
    }

    const member = await createMember({
      firstName,
      lastName,
      email,
      membershipId,
      middleName: payload.middleName,
      initials: payload.initials,
      title: payload.title,
      phone: payload.phone,
      mobile: payload.mobile,
      address: payload.address,
      postalCode: payload.postalCode,
      city: payload.city,
      groupName: payload.groupName,
      sport: payload.sport,
      background: payload.background,
      notes: payload.notes,
      membershipCustomName: payload.membershipCustomName,
      customAmount: payload.customAmount !== undefined && payload.customAmount !== null ? Number(payload.customAmount) : undefined,
      joinDate: payload.joinDate,
      billingCycle: payload.billingCycle,
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error: any) {
    console.error("Failed to create member", error)
    const status = error?.status ?? 500
    const message = error?.message || "Kon lid niet aanmaken"
    return NextResponse.json({ error: message }, { status })
  }
}
