import { NextResponse } from "next/server"
import { listMembershipPlans } from "@/lib/facturatie/service"

export async function GET() {
  try {
    const plans = await listMembershipPlans()
    return NextResponse.json(plans)
  } catch (error: any) {
    console.error("Failed to list membership plans", error)
    return NextResponse.json({ error: "Kon lidmaatschappen niet ophalen" }, { status: 500 })
  }
}
