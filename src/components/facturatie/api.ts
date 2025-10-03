import type { MemberRecord, MembershipPlan } from "@/lib/facturatie/types"

interface CreateMemberPayload {
  firstName: string
  lastName: string
  middleName?: string
  initials?: string
  title?: string
  email: string
  phone?: string
  mobile?: string
  address?: string
  postalCode?: string
  city?: string
  groupName?: string
  sport?: string
  background?: string
  notes?: string
  membershipId: string
  membershipCustomName?: string
  customAmount?: number
  joinDate?: string
  billingCycle?: string
}

interface UpdateMemberPayload extends Partial<CreateMemberPayload> {}

interface SendInvoicesPayload {
  memberIds: string[]
  cycleKey: string
  notes?: string
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Request failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchMembers(): Promise<MemberRecord[]> {
  const res = await fetch("/api/facturatie/members")
  return handleResponse<MemberRecord[]>(res)
}

export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const res = await fetch("/api/facturatie/memberships")
  return handleResponse<MembershipPlan[]>(res)
}

export async function createMember(payload: CreateMemberPayload): Promise<MemberRecord> {
  const res = await fetch("/api/facturatie/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<MemberRecord>(res)
}

export async function updateMember(id: string, payload: UpdateMemberPayload): Promise<MemberRecord> {
  const res = await fetch(`/api/facturatie/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<MemberRecord>(res)
}

export async function deleteMember(id: string): Promise<void> {
  const res = await fetch(`/api/facturatie/members/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `Failed to delete member ${id}`)
  }
}

export async function changeMembership(
  id: string,
  payload: { membershipId: string; membershipCustomName?: string; customAmount?: number; billingCycle?: string },
): Promise<MemberRecord> {
  const res = await fetch(`/api/facturatie/members/${id}/membership`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<MemberRecord>(res)
}

export async function sendInvoices(payload: SendInvoicesPayload): Promise<{ runId: string }>
export async function sendInvoices(payload: SendInvoicesPayload): Promise<{ runId: string }> {
  const res = await fetch("/api/facturatie/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleResponse<{ runId: string }>(res)
}
