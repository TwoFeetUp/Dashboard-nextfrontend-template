import { NextResponse } from "next/server"
import {
  createInvoiceRunRecord,
  getMembersByIds,
  markMembersInvoiced,
  updateInvoiceRunRecord,
} from "@/lib/facturatie/service"
import type { MemberRecord } from "@/lib/facturatie/types"

const MAKE_URL = process.env.MAKE_WEBHOOK_URL
const MAKE_SECRET = process.env.MAKE_WEBHOOK_SECRET

function buildInvoicePayload(members: MemberRecord[], cycleKey: string, notes?: string) {
  const issueDate = new Date()
  const dueDate = new Date(issueDate)
  dueDate.setDate(dueDate.getDate() + 30)

  const memberPayload = members.map((member) => {
    const amount = member.customAmount ?? member.membershipAmount
    const membershipYear = parseInt(member.billingCycle, 10)
    const cycleYear = Number.isNaN(membershipYear) ? new Date().getFullYear() : membershipYear

    const customerNameParts = [member.firstName]
    if (member.middleName) customerNameParts.push(member.middleName)
    customerNameParts.push(member.lastName)

    return {
      customer: {
        customer_number: member.lidnr,
        name: customerNameParts.join(" ").trim(),
        initials: member.initials ?? null,
        infix: member.middleName ?? null,
        address: member.address ?? null,
        postal_code: member.postalCode ?? null,
        city: member.city ?? null,
        country: "NL",
        email: member.email,
        phone: member.phone ?? null,
        mobile: member.mobile ?? null,
      },
      membership: {
        type: member.membershipType,
        year: cycleYear,
        display_name: member.membershipName,
        custom_amount: member.membershipType === "custom" ? amount : undefined,
        billing_cycle: member.billingCycle,
      },
      invoice_meta: {
        invoice_number: null,
        issue_date: issueDate.toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        reference: cycleKey,
        notes: notes ?? null,
      },
      invoice_lines: [
        {
          description: `${member.membershipName} ${cycleKey}`.trim(),
          unit_price: amount,
          quantity: 1,
          line_total: amount,
        },
      ],
      tax: {
        vat_rate: null,
        vat_included: true,
      },
      totals: {
        currency: "EUR",
        subtotal: amount,
        vat_amount: 0,
        grand_total: amount,
      },
    }
  })

  return {
    cycle_key: cycleKey,
    issued_at: issueDate.toISOString(),
    due_at: dueDate.toISOString(),
    member_count: members.length,
    notes: notes ?? null,
    members: memberPayload,
  }
}

export async function POST(request: Request) {
  if (!MAKE_URL) {
    return NextResponse.json({ error: "MAKE_WEBHOOK_URL is niet ingesteld" }, { status: 500 })
  }

  try {
    const { memberIds, cycleKey, notes } = await request.json()
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: "memberIds moet een array zijn met minimaal één waarde" }, { status: 400 })
    }
    if (typeof cycleKey !== "string" || !cycleKey.trim()) {
      return NextResponse.json({ error: "cycleKey is verplicht" }, { status: 400 })
    }

    const members = await getMembersByIds(memberIds)
    if (members.length !== memberIds.length) {
      return NextResponse.json({ error: "Kon niet alle leden laden" }, { status: 404 })
    }

    const payload = buildInvoicePayload(members, cycleKey, notes)
    const run = await createInvoiceRunRecord({
      cycleKey,
      memberIds,
      status: "pending",
      payload,
      notes,
      metadata: { memberCount: memberIds.length },
    })

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (MAKE_SECRET) {
        headers.Authorization = `Bearer ${MAKE_SECRET}`
      }

      const response = await fetch(MAKE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      const text = await response.text()
      let responseBody: unknown = text
      try {
        responseBody = JSON.parse(text)
      } catch (error) {
        // keep raw text
      }

      if (!response.ok) {
        await updateInvoiceRunRecord(run.id, {
          status: "failed",
          response: responseBody,
        })
        return NextResponse.json(
          { error: "Make.com webhook gaf een foutmelding", details: responseBody },
          { status: 502 },
        )
      }

      const invoiceDate = new Date().toISOString()
      await markMembersInvoiced(memberIds, invoiceDate)
      await updateInvoiceRunRecord(run.id, {
        status: "sent",
        response: responseBody,
        executedAt: invoiceDate,
        metadata: { memberCount: memberIds.length, cycleKey },
      })

      return NextResponse.json({ runId: run.id })
    } catch (error: any) {
      await updateInvoiceRunRecord(run.id, {
        status: "failed",
        response: { error: error?.message || "Onbekende fout" },
      })
      console.error("Make.com request failed", error)
      return NextResponse.json({ error: "Versturen naar Make.com is mislukt" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Unexpected error in invoice send route", error)
    return NextResponse.json({ error: "Onverwachte fout" }, { status: 500 })
  }
}

