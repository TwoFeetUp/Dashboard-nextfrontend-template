export interface MembershipPlan {
  id: string
  type: string
  displayName: string
  amount: number
  description?: string
  billingCycle: string
  isActive: boolean
  created: string
  updated: string
}

export interface MemberRecord {
  id: string
  sequence: number
  lidnr: string
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
  membershipType: string
  membershipName: string
  membershipAmount: number
  customAmount?: number
  joinDate: string
  lastInvoiceDate?: string
  billingCycle: string
  created: string
  updated: string
}

export interface InvoiceCycleMeta {
  id: string
  cycleKey: string
  members: string[]
  status: "pending" | "sent" | "failed"
  payloadPreview?: unknown
  triggeredBy: string
  executedAt?: string
  created: string
  updated: string
}
