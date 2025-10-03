import type { RecordModel } from "pocketbase"
import { getAdminPocketBase } from "@/lib/pocketbase-admin"
import type { InvoiceCycleMeta, MemberRecord, MembershipPlan } from "@/lib/facturatie/types"

const MEMBERS_COLLECTION = "facturatie_members"
const MEMBERSHIPS_COLLECTION = "facturatie_memberships"
const INVOICE_RUN_COLLECTION = "facturatie_invoice_runs"

function mapMembership(record: RecordModel): MembershipPlan {
  return {
    id: record.id,
    type: record.type,
    displayName: record.displayName,
    amount: Number(record.amount ?? 0),
    description: record.description ?? undefined,
    billingCycle: record.billingCycle ?? "",
    isActive: Boolean(record.isActive ?? false),
    created: record.created,
    updated: record.updated,
  }
}

function parseDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new Date(value).toISOString()
  } catch (error) {
    console.error("Failed to parse date", value, error)
    return undefined
  }
}

function mapMember(record: RecordModel): MemberRecord {
  const membershipRecordId = (record.membershipId ?? record.membershipPlan ?? '') as string | string[]
  const membershipIdValue = Array.isArray(membershipRecordId) ? membershipRecordId[0] : membershipRecordId
  return {
    id: record.id,
    sequence: Number(record.sequence ?? 0),
    lidnr: record.lidnr,
    firstName: record.firstName,
    lastName: record.lastName,
    middleName: record.middleName ?? undefined,
    initials: record.initials ?? undefined,
    title: record.title ?? undefined,
    email: record.email,
    phone: record.phone ?? undefined,
    mobile: record.mobile ?? undefined,
    address: record.address ?? undefined,
    postalCode: record.postalCode ?? undefined,
    city: record.city ?? undefined,
    groupName: record.groupName ?? undefined,
    sport: record.sport ?? undefined,
    background: record.background ?? undefined,
    notes: record.notes ?? undefined,
    membershipId: membershipIdValue ? String(membershipIdValue) : '',
    membershipType: record.membershipType,
    membershipName: record.membershipName,
    membershipAmount: Number(record.membershipAmount ?? 0),
    customAmount:
      record.customAmount !== undefined && record.customAmount !== null
        ? Number(record.customAmount)
        : undefined,
    joinDate: parseDate(record.joinDate) ?? new Date().toISOString(),
    lastInvoiceDate: parseDate(record.lastInvoiceDate),
    billingCycle: record.billingCycle ?? "",
    created: record.created,
    updated: record.updated,
  }
}

function mapInvoiceRun(record: RecordModel): InvoiceCycleMeta {
  const recordFields = record as Record<string, unknown>
  const rawMemberIds = recordFields["memberIds"] ?? recordFields["members"]
  const memberIds: string[] = Array.isArray(rawMemberIds) ? rawMemberIds.map((id) => String(id)) : []
  return {
    id: record.id,
    cycleKey: record.cycleKey,
    members: memberIds,
    status: (record.status as InvoiceCycleMeta['status']) || 'pending',
    payloadPreview: record.payload ?? undefined,
    triggeredBy: record.triggeredBy || '',
    executedAt: parseDate(record.executedAt),
    created: record.created,
    updated: record.updated,
  }
}

async function loadLatestSequence(): Promise<number> {
  const pb = await getAdminPocketBase()
  const result = await pb.collection(MEMBERS_COLLECTION).getList(1, 1, { sort: "-sequence" })
  const latest = result.items[0]
  return latest ? Number(latest.sequence ?? 0) : 0
}

function buildMemberNumber(sequence: number): { sequence: number; lidnr: string } {
  const formatted = String(sequence).padStart(4, "0")
  return { sequence, lidnr: `OS${formatted}` }
}

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function listMembershipPlans(): Promise<MembershipPlan[]> {
  const pb = await getAdminPocketBase()
  const records = await pb.collection(MEMBERSHIPS_COLLECTION).getFullList({ sort: "type" })
  const plans = records
    .filter((record) => Boolean(record.isActive) || record.type === "custom" || record.type === "no_invoice")
    .map(mapMembership)

  // Add "Erelid" as a virtual membership
  plans.push({
    id: "erelid",
    type: "gewoon",
    displayName: "Erelid",
    amount: 0,
    billingCycle: new Date().getFullYear().toString(),
    isActive: true,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  })

  return plans
}

export async function listAllMembershipPlans(): Promise<MembershipPlan[]> {
  const pb = await getAdminPocketBase()
  const records = await pb.collection(MEMBERSHIPS_COLLECTION).getFullList({ sort: "type" })
  return records
    .filter((record) => Boolean(record.isActive) || record.type === "custom" || record.type === "no_invoice")
    .map(mapMembership)
}

export async function getMembershipPlan(id: string): Promise<MembershipPlan> {
  // Handle custom membership
  if (id === "custom") {
    return {
      id: "custom",
      type: "custom",
      displayName: "Custom",
      amount: 0,
      billingCycle: new Date().getFullYear().toString(),
      isActive: true,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
  }

  // Handle "Erelid" membership
  if (id === "erelid") {
    return {
      id: "erelid",
      type: "gewoon",
      displayName: "Erelid",
      amount: 0,
      billingCycle: new Date().getFullYear().toString(),
      isActive: true,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
  }

  const pb = await getAdminPocketBase()
  const record = await pb.collection(MEMBERSHIPS_COLLECTION).getOne(id)
  return mapMembership(record)
}

interface CreateMemberData {
  firstName: string
  lastName: string
  email: string
  membershipId: string
  middleName?: string
  initials?: string
  title?: string
  phone?: string
  mobile?: string
  address?: string
  postalCode?: string
  city?: string
  groupName?: string
  sport?: string
  background?: string
  notes?: string
  membershipCustomName?: string
  customAmount?: number
  joinDate?: string
  billingCycle?: string
}

export async function createMember(data: CreateMemberData): Promise<MemberRecord> {
  const pb = await getAdminPocketBase()
  const membership = await getMembershipPlan(data.membershipId)
  let attempt = 0
  while (attempt < 5) {
    attempt += 1
    const nextSequence = (await loadLatestSequence()) + 1
    const { sequence, lidnr } = buildMemberNumber(nextSequence)
    const payload = {
      sequence,
      lidnr,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: sanitizeText(data.middleName),
      initials: sanitizeText(data.initials),
      title: sanitizeText(data.title),
      email: data.email,
      phone: sanitizeText(data.phone),
      mobile: sanitizeText(data.mobile),
      address: sanitizeText(data.address),
      postalCode: sanitizeText(data.postalCode),
      city: sanitizeText(data.city),
      groupName: sanitizeText(data.groupName),
      sport: sanitizeText(data.sport),
      background: sanitizeText(data.background),
      notes: sanitizeText(data.notes),
      membershipId: (membership.id === "custom" || membership.id === "erelid") ? null : membership.id,
      membershipType: membership.type,
      membershipName: data.membershipCustomName?.trim() || membership.displayName,
      membershipAmount: membership.amount,
      customAmount: data.customAmount ?? null,
      joinDate: data.joinDate || new Date().toISOString(),
      billingCycle: data.billingCycle || membership.billingCycle,
    }

    try {
      const record = await pb.collection(MEMBERS_COLLECTION).create(payload)
      const full = await pb.collection(MEMBERS_COLLECTION).getOne(record.id)
      return mapMember(full)
    } catch (error: any) {
      const message = error?.data?.data
      const duplicate = message?.sequence || message?.lidnr
      if (duplicate && attempt < 5) {
        continue
      }
      throw error
    }
  }

  throw new Error("Kon geen uniek lidnummer genereren")
}

interface UpdateMemberData extends Partial<CreateMemberData> {}

export async function updateMember(id: string, data: UpdateMemberData): Promise<MemberRecord> {
  const pb = await getAdminPocketBase()
  const patch: Record<string, unknown> = {}

  if (data.firstName !== undefined) patch.firstName = data.firstName
  if (data.lastName !== undefined) patch.lastName = data.lastName
  if (data.email !== undefined) patch.email = data.email

  const assignText = (key: string, value: unknown) => {
    if (value === undefined) return
    patch[key] = sanitizeText(value)
  }

  assignText("middleName", data.middleName)
  assignText("initials", data.initials)
  assignText("title", data.title)
  assignText("phone", data.phone)
  assignText("mobile", data.mobile)
  assignText("address", data.address)
  assignText("postalCode", data.postalCode)
  assignText("city", data.city)
  assignText("groupName", data.groupName)
  assignText("sport", data.sport)
  assignText("background", data.background)
  assignText("notes", data.notes)

  if (data.joinDate !== undefined) patch.joinDate = data.joinDate || null
  if (data.billingCycle !== undefined) patch.billingCycle = data.billingCycle || null

  await pb.collection(MEMBERS_COLLECTION).update(id, patch)
  const record = await pb.collection(MEMBERS_COLLECTION).getOne(id)
  return mapMember(record)
}

export async function deleteMember(id: string): Promise<void> {
  const pb = await getAdminPocketBase()
  await pb.collection(MEMBERS_COLLECTION).delete(id)
}

export async function changeMemberMembership(
  id: string,
  data: { membershipId: string; membershipCustomName?: string; customAmount?: number; billingCycle?: string },
): Promise<MemberRecord> {
  const pb = await getAdminPocketBase()
  const membership = await getMembershipPlan(data.membershipId)
  await pb.collection(MEMBERS_COLLECTION).update(id, {
    membershipId: (membership.id === "custom" || membership.id === "geen_contributie") ? null : membership.id,
    membershipType: membership.type,
    membershipName: data.membershipCustomName?.trim() || membership.displayName,
    membershipAmount: membership.amount,
    customAmount: data.customAmount ?? null,
    billingCycle: data.billingCycle || membership.billingCycle,
  })
  const record = await pb.collection(MEMBERS_COLLECTION).getOne(id)
  return mapMember(record)
}

export async function listMembers(): Promise<MemberRecord[]> {
  const pb = await getAdminPocketBase()
  const records = await pb.collection(MEMBERS_COLLECTION).getFullList({ sort: "sequence" })
  return records.map(mapMember)
}

export async function markMembersInvoiced(memberIds: string[], invoiceDate: string): Promise<void> {
  const pb = await getAdminPocketBase()
  await Promise.all(
    memberIds.map((id) =>
      pb.collection(MEMBERS_COLLECTION).update(id, {
        lastInvoiceDate: invoiceDate,
      }),
    ),
  )
}

export async function getMembersByIds(ids: string[]): Promise<MemberRecord[]> {
  if (ids.length === 0) return []
  const pb = await getAdminPocketBase()
  const records = await Promise.all(ids.map((id) => pb.collection(MEMBERS_COLLECTION).getOne(id)))
  return records.map(mapMember)
}

export async function createInvoiceRunRecord(data: {
  cycleKey: string
  memberIds: string[]
  status?: InvoiceCycleMeta["status"]
  payload?: unknown
  response?: unknown
  notes?: string
  triggeredBy?: string
  executedAt?: string
  makeExecutionId?: string
  metadata?: unknown
}): Promise<InvoiceCycleMeta> {
  const pb = await getAdminPocketBase()
  const record = await pb.collection(INVOICE_RUN_COLLECTION).create({
    cycleKey: data.cycleKey,
    memberIds: data.memberIds,
    status: data.status ?? "pending",
    payload: data.payload ?? null,
    response: data.response ?? null,
    notes: data.notes ?? null,
    triggeredBy: data.triggeredBy ?? null,
    executedAt: data.executedAt ?? null,
    makeExecutionId: data.makeExecutionId ?? null,
    metadata: data.metadata ?? null,
  })
  return mapInvoiceRun(record)
}

export async function updateInvoiceRunRecord(
  id: string,
  data: {
    status?: InvoiceCycleMeta["status"]
    payload?: unknown
    response?: unknown
    notes?: string
    triggeredBy?: string
    executedAt?: string
    makeExecutionId?: string
    metadata?: unknown
  },
): Promise<InvoiceCycleMeta> {
  const pb = await getAdminPocketBase()
  const patch: Record<string, unknown> = {}
  if (data.status !== undefined) patch.status = data.status
  if (data.payload !== undefined) patch.payload = data.payload
  if (data.response !== undefined) patch.response = data.response
  if (data.notes !== undefined) patch.notes = data.notes ?? null
  if (data.triggeredBy !== undefined) patch.triggeredBy = data.triggeredBy ?? null
  if (data.executedAt !== undefined) patch.executedAt = data.executedAt ?? null
  if (data.makeExecutionId !== undefined) patch.makeExecutionId = data.makeExecutionId ?? null
  if (data.metadata !== undefined) patch.metadata = data.metadata ?? null
  const record = await pb.collection(INVOICE_RUN_COLLECTION).update(id, patch)
  return mapInvoiceRun(record)
}


