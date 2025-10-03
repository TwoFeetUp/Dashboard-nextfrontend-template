"use client"

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react"
import { toast } from "sonner"
import { Euro, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MemberRecord, MembershipPlan } from "@/lib/facturatie/types"
import {
  changeMembership,
  createMember,
  deleteMember,
  fetchMembers,
  fetchMembershipPlans,
  sendInvoices,
  updateMember,
} from "./api"
import * as XLSX from "xlsx"

interface MemberFormState {
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
  isCustomMembership?: boolean
}

const emptyFormState: MemberFormState = {
  firstName: "",
  lastName: "",
  email: "",
  membershipId: "",
  billingCycle: new Date().getFullYear().toString(),
  isCustomMembership: false,
}

function getDisplayAmount(member: MemberRecord): number {
  // Only use customAmount if it's explicitly set and greater than 0
  // Otherwise use the standard membershipAmount
  if (member.customAmount != null && member.customAmount > 0) {
    return member.customAmount
  }
  return member.membershipAmount
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount)
}

const NO_INVOICE_LABEL = "Hoeft niet te betalen"

function getEffectiveAmount(member: Pick<MemberRecord, "membershipAmount" | "customAmount">): number {
  // Only use customAmount if it's explicitly set and greater than 0
  // Otherwise use the standard membershipAmount
  if (member.customAmount != null && member.customAmount > 0) {
    return member.customAmount
  }
  return member.membershipAmount
}

function isInvoiceEligible(member: Pick<MemberRecord, "membershipAmount" | "customAmount">): boolean {
  return getEffectiveAmount(member) > 0
}

function isNoInvoiceAmount(amount: number | undefined | null): boolean {
  return amount !== undefined && amount !== null && amount <= 0
}
export function FacturatieTool(): JSX.Element {
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailedView, setIsDetailedView] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditMemberId, setShowEditMemberId] = useState<string | null>(null)
  const [showChangeMembershipId, setShowChangeMembershipId] = useState<string | null>(null)
  const [formState, setFormState] = useState<MemberFormState>(emptyFormState)
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number | null>(null)
  const [invoiceCycleKey, setInvoiceCycleKey] = useState<string>(new Date().getFullYear().toString())
  const [invoiceNotes, setInvoiceNotes] = useState<string>("")
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)
  const [isSendingInvoices, setIsSendingInvoices] = useState(false)

  const sanitizeSelection = (list: MemberRecord[]) => {
    setSelectedMemberIds((prev) =>
      prev.filter((id) => {
        const member = list.find((item) => item.id === id)
        return member ? isInvoiceEligible(member) : false
      }),
    )
  }

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [memberList, plans] = await Promise.all([fetchMembers(), fetchMembershipPlans()])
        setMembers(memberList)
        sanitizeSelection(memberList)
        setMembershipPlans(plans.filter((plan) => plan.isActive || plan.type === "custom" || plan.type === "no_invoice"))
        if (plans.length > 0) {
          setInvoiceCycleKey((current) => current || plans[0]?.billingCycle || current)
        }
      } catch (error) {
        console.error(error)
        toast.error("Kon facturatiegegevens niet laden")
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  const reloadMembers = async () => {
    try {
      const updatedMembers = await fetchMembers()
      setMembers(updatedMembers)
      sanitizeSelection(updatedMembers)
    } catch (error) {
      console.error(error)
      toast.error("Kon leden niet vernieuwen")
    }
  }

  const selectedPlan = useMemo(() => {
    if (!formState.membershipId) return undefined
    return membershipPlans.find((plan) => plan.id === formState.membershipId)
  }, [formState.membershipId, membershipPlans])

  useEffect(() => {
    if (selectedPlan) {
      // Set the membership custom name if it's not already set
      if (!formState.membershipCustomName) {
        setFormState((prev) => ({ ...prev, membershipCustomName: selectedPlan.displayName }))
      }
      
      // Set the billing cycle if it's not already set
      if (!formState.billingCycle) {
        setFormState((prev) => ({ ...prev, billingCycle: selectedPlan.billingCycle }))
      }
      
      // Store the selected plan amount for reference
      setSelectedPlanAmount(selectedPlan.amount)
      
      // If customAmount is not set, set it to the plan's default amount
      if (formState.customAmount === undefined || formState.customAmount === null) {
        setFormState((prev) => ({ ...prev, customAmount: selectedPlan.amount }))
      }
    } else {
      // Reset the selected plan amount when no plan is selected
      setSelectedPlanAmount(null)
    }
  }, [selectedPlan, formState.membershipCustomName, formState.billingCycle, formState.customAmount])

  const stats = useMemo(() => {
    const totalMembers = members.length
    const businessMembers = members.filter((m) => m.membershipType === "bedrijf").length
    const sponsors = members.filter((m) => m.membershipType === "sponsoring").length
    const yearlyRevenue = members.reduce((sum, m) => sum + getDisplayAmount(m), 0)
    const noInvoiceMembers = members.filter((member) => !isInvoiceEligible(member)).length
    return { totalMembers, businessMembers, sponsors, yearlyRevenue, noInvoiceMembers }
  }, [members])

  const selectableMembers = useMemo(() => members.filter((member) => isInvoiceEligible(member)), [members])

  const toggleSelectAll = () => {
    if (selectableMembers.length === 0) {
      setSelectedMemberIds([])
      return
    }
    if (selectedMemberIds.length === selectableMembers.length) {
      setSelectedMemberIds([])
    } else {
      setSelectedMemberIds(selectableMembers.map((member) => member.id))
    }
  }

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  const openAddModal = () => {
    setFormState({ ...emptyFormState, membershipId: membershipPlans[0]?.id ?? "" })
    setShowAddMember(true)
  }

  const openEditModal = (member: MemberRecord) => {
    setShowChangeMembershipId(null)
    setShowEditMemberId(member.id)
    setFormState({
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName,
      initials: member.initials,
      title: member.title,
      email: member.email,
      phone: member.phone,
      mobile: member.mobile,
      address: member.address,
      postalCode: member.postalCode,
      city: member.city,
      groupName: member.groupName,
      sport: member.sport,
      background: member.background,
      notes: member.notes,
      membershipId: member.membershipId,
      membershipCustomName: member.membershipName,
      customAmount: member.customAmount,
      joinDate: member.joinDate?.slice(0, 10),
      billingCycle: member.billingCycle,
    })
  }

  const openChangeMembership = (member: MemberRecord) => {
    setShowEditMemberId(null)
    setShowChangeMembershipId(member.id)
    setFormState({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      membershipId: member.membershipId,
      membershipCustomName: member.membershipName,
      customAmount: member.customAmount,
      billingCycle: member.billingCycle,
    })
  }

  const closeModals = () => {
    setShowAddMember(false)
    setShowEditMemberId(null)
    setShowChangeMembershipId(null)
    setFormState(emptyFormState)
  }
  const handleCreateMember = async (event: FormEvent) => {
    event.preventDefault()
    if (!formState.firstName || !formState.lastName || !formState.email || !formState.membershipId) {
      toast.error("Vul alle verplichte velden in")
      return
    }

    try {
      const payload = { ...formState }
      const newMember = await createMember(payload)
      setMembers((prev) => [...prev, newMember].sort((a, b) => a.sequence - b.sequence))
      toast.success(`Lid ${newMember.firstName} ${newMember.lastName} aangemaakt`)
      closeModals()
    } catch (error) {
      console.error(error)
      toast.error("Kon lid niet aanmaken")
    }
  }

  const handleUpdateMember = async (event: FormEvent) => {
    event.preventDefault()
    if (!showEditMemberId) return
    try {
      const updated = await updateMember(showEditMemberId, formState)
      setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)))
      toast.success("Lid bijgewerkt")
      closeModals()
    } catch (error) {
      console.error(error)
      toast.error("Kon lid niet bijwerken")
    }
  }

  const handleChangeMembership = async (event: FormEvent) => {
    event.preventDefault()
    if (!showChangeMembershipId || !formState.membershipId) return
    try {
      const updated = await changeMembership(showChangeMembershipId, {
        membershipId: formState.membershipId,
        membershipCustomName: formState.membershipCustomName,
        customAmount: formState.customAmount,
        billingCycle: formState.billingCycle,
      })
      setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)))
      toast.success("Lidmaatschap bijgewerkt")
      closeModals()
    } catch (error) {
      console.error(error)
      toast.error("Kon lidmaatschap niet wijzigen")
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    setBusyMemberId(memberId)
    try {
      await deleteMember(memberId)
      setMembers((prev) => prev.filter((member) => member.id !== memberId))
      setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId))
      toast.success("Lid verwijderd")
    } catch (error) {
      console.error(error)
      toast.error("Kon lid niet verwijderen")
    } finally {
      setBusyMemberId(null)
    }
  }

  const exportToCSV = () => {
    if (members.length === 0) {
      toast.info("Geen leden om te exporteren")
      return
    }

    const headers = [
      "Lidnummer",
      "Voornaam",
      "Achternaam",
      "Tussenvoegsel",
      "Initialen",
      "Titel",
      "Email",
      "Telefoon",
      "Mobiel",
      "Adres",
      "Postcode",
      "Plaats",
      "Groep",
      "Lidmaatschap",
      "Bedrag",
      "Custom Bedrag",
      "Laatst Gefactureerd",
      "Facturatiecyclus",
    ]

    const rows = members.map((member) => [
      member.lidnr,
      member.firstName,
      member.lastName,
      member.middleName ?? "",
      member.initials ?? "",
      member.title ?? "",
      member.email,
      member.phone ?? "",
      member.mobile ?? "",
      member.address ?? "",
      member.postalCode ?? "",
      member.city ?? "",
      member.groupName ?? "",
      member.membershipName,
      formatCurrency(member.membershipAmount),
      member.customAmount != null ? formatCurrency(member.customAmount) : "",
      member.lastInvoiceDate ? new Date(member.lastInvoiceDate).toLocaleDateString("nl-NL") : "-",
      member.billingCycle,
    ])

    const csvLines = [headers.join(";"), ...rows.map((row) => row.map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`).join(";"))]
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "facturatie-leden.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("CSV export aangemaakt")
  }

  const exportToExcel = () => {
    if (members.length === 0) {
      toast.info("Geen leden om te exporteren")
      return
    }

    const sheetData = members.map((member) => ({
      Lidnummer: member.lidnr,
      Voornaam: member.firstName,
      Achternaam: member.lastName,
      Tussenvoegsel: member.middleName ?? "",
      Initialen: member.initials ?? "",
      Titel: member.title ?? "",
      Email: member.email,
      Telefoon: member.phone ?? "",
      Mobiel: member.mobile ?? "",
      Adres: member.address ?? "",
      Postcode: member.postalCode ?? "",
      Plaats: member.city ?? "",
      Groep: member.groupName ?? "",
      Lidmaatschap: member.membershipName,
      Bedrag: getDisplayAmount(member),
      "Laatst Gefactureerd": member.lastInvoiceDate
        ? new Date(member.lastInvoiceDate).toLocaleDateString("nl-NL")
        : "-",
      Facturatiecyclus: member.billingCycle,
    }))

    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leden")
    XLSX.writeFile(workbook, "facturatie-leden.xlsx")
    toast.success("Excel export aangemaakt")
  }

  const handleSendInvoices = async () => {
    if (selectedMemberIds.length === 0) {
      toast.info("Selecteer leden om te factureren")
      return
    }
    if (!invoiceCycleKey) {
      toast.error("Voer een facturatiecyclus in")
      return
    }

    const billableIds = selectedMemberIds.filter((id) => {
      const member = members.find((item) => item.id === id)
      return member ? isInvoiceEligible(member) : false
    })

    if (billableIds.length === 0) {
      toast.info("Geselecteerde leden hoeven niet te betalen")
      return
    }

    const skippedCount = selectedMemberIds.length - billableIds.length
    if (skippedCount > 0) {
      toast.info(`${skippedCount} lid(leden) overgeslagen omdat er niets gefactureerd hoeft te worden`)
    }

    setIsSendingInvoices(true)
    try {
      const result = await sendInvoices({ memberIds: billableIds, cycleKey: invoiceCycleKey, notes: invoiceNotes })
      toast.success(`Facturen verstuurd. Run-ID: ${result.runId}`)
      await reloadMembers()
      setSelectedMemberIds([])
      setInvoiceNotes("")
    } catch (error) {
      console.error(error)
      toast.error("Versturen naar Make.com is mislukt")
    } finally {
      setIsSendingInvoices(false)
    }
  }

  const renderMemberTableHeader = () => (
    <thead className="bg-orange-50">
      <tr className="text-left text-sm text-gray-600">
        <th className="p-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-orange-300 text-orange-600"
            checked={selectableMembers.length > 0 && selectedMemberIds.length === selectableMembers.length}
            onChange={toggleSelectAll}
          />
        </th>
        <th className="p-3">Naam</th>
        <th className="p-3">Email</th>
        <th className="p-3">Lidmaatschap</th>
        <th className="p-3">Factuurbedrag</th>
        <th className="p-3">Laatste Factuur</th>
        <th className="p-3">Acties</th>
      </tr>
    </thead>
  )

  const renderMemberRow = (member: MemberRecord) => {
    const amount = getDisplayAmount(member)
    const invoiceEligible = isInvoiceEligible(member)
    return (
      <tr key={member.id} className="border-b border-orange-100 text-sm hover:bg-orange-50/40">
        <td className="p-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-orange-300 text-orange-600"
            checked={selectedMemberIds.includes(member.id)}
            disabled={!invoiceEligible}
            onChange={() => toggleMemberSelection(member.id)}
            title={!invoiceEligible ? NO_INVOICE_LABEL : undefined}
          />
        </td>
        <td className="p-3 font-medium text-gray-900">
          {member.firstName} {member.middleName ? `${member.middleName} ` : ""}
          {member.lastName}
        </td>
        <td className="p-3 text-gray-600">{member.email}</td>
        <td className="p-3 text-gray-600">
          <div className="flex items-center gap-2">
            <span>{member.membershipName}</span>
            {!invoiceEligible && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {NO_INVOICE_LABEL}
              </span>
            )}
          </div>
        </td>
        <td className="p-3 font-semibold text-orange-600">{formatCurrency(amount)}</td>
        <td className="p-3 text-gray-600">
          {member.lastInvoiceDate ? new Date(member.lastInvoiceDate).toLocaleDateString("nl-NL") : "-"}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditModal(member)}>
              Bewerken
            </Button>
            <Button variant="outline" size="sm" onClick={() => openChangeMembership(member)}>
              Lidmaatschap
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyMemberId === member.id}
              onClick={() => handleDeleteMember(member.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {busyMemberId === member.id ? "Verwijderen..." : "Verwijder"}
            </Button>
          </div>
        </td>
      </tr>
    )
  }
  const renderDetailedRow = (member: MemberRecord) => {
    const amount = getDisplayAmount(member)
    const invoiceEligible = isInvoiceEligible(member)
    return (
      <tr key={`detail-${member.id}`} className="border-b border-orange-100 text-xs md:text-sm">
        <td className="p-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-orange-300 text-orange-600"
            checked={selectedMemberIds.includes(member.id)}
            disabled={!invoiceEligible}
            onChange={() => toggleMemberSelection(member.id)}
            title={!invoiceEligible ? NO_INVOICE_LABEL : undefined}
          />
        </td>
        <td className="p-2">{member.lidnr}</td>
        <td className="p-2">{member.joinDate ? new Date(member.joinDate).toLocaleDateString("nl-NL") : "-"}</td>
        <td className="p-2">{member.groupName ?? "-"}</td>
        <td className="p-2">{member.title ?? "-"}</td>
        <td className="p-2">{member.initials ?? "-"}</td>
        <td className="p-2">{member.middleName ?? "-"}</td>
        <td className="p-2 font-medium">{member.lastName}</td>
        <td className="p-2">{member.firstName}</td>
        <td className="p-2">{member.email}</td>
        <td className="p-2">{member.phone ?? "-"}</td>
        <td className="p-2">{member.mobile ?? "-"}</td>
        <td className="p-2">{member.address ?? "-"}</td>
        <td className="p-2">{member.postalCode ?? "-"}</td>
        <td className="p-2">{member.city ?? "-"}</td>
        <td className="p-2">
          <div className="flex items-center gap-2">
            <span>{member.membershipName}</span>
            {!invoiceEligible && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {NO_INVOICE_LABEL}
              </span>
            )}
          </div>
        </td>
        <td className="p-2">{formatCurrency(amount)}</td>
        <td className="p-2">{member.customAmount != null ? formatCurrency(member.customAmount) : "-"}</td>
        <td className="p-2">{member.billingCycle}</td>
        <td className="p-2">
          {member.lastInvoiceDate ? new Date(member.lastInvoiceDate).toLocaleDateString("nl-NL") : "-"}
        </td>
        <td className="p-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openEditModal(member)}>
              Bewerken
            </Button>
            <Button variant="outline" size="sm" onClick={() => openChangeMembership(member)}>
              Lidmaatschap
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busyMemberId === member.id}
              onClick={() => handleDeleteMember(member.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {busyMemberId === member.id ? "Verwijderen..." : "Verwijder"}
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturatie Tool</CardTitle>
          <CardDescription>Bezig met laden...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded-lg bg-orange-100/60" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Euro className="h-5 w-5 text-orange-600" />
            Facturatie Tool
          </CardTitle>
          <CardDescription>Beheer leden en verstuur facturatiegegevens naar Make.com</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="Totaal leden" value={stats.totalMembers.toString()} />
            <SummaryTile label="Jaarlijkse omzet" value={formatCurrency(stats.yearlyRevenue)} />
            <SummaryTile label="Bedrijfsleden" value={stats.businessMembers.toString()} />
            <SummaryTile label="Sponsoren" value={stats.sponsors.toString()} />
          </section>

          <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button onClick={openAddModal} className="bg-orange-500 hover:bg-orange-600 text-white">
                Nieuw lid
              </Button>
              <Button variant="outline" onClick={() => setIsDetailedView((prev) => !prev)}>
                {isDetailedView ? "Compact overzicht" : "Alle gegevens"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="invoice-cycle" className="text-xs uppercase tracking-wide text-gray-500">
                  Facturatiecyclus
                </Label>
                <Input
                  id="invoice-cycle"
                  value={invoiceCycleKey}
                  onChange={(event) => setInvoiceCycleKey(event.target.value)}
                  className="w-32"
                />
              </div>
              <Input
                placeholder="Notitie voor Make.com (optioneel)"
                value={invoiceNotes}
                onChange={(event) => setInvoiceNotes(event.target.value)}
                className="w-64"
              />
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={selectedMemberIds.length === 0 || isSendingInvoices}
                onClick={handleSendInvoices}
              >
                {isSendingInvoices ? "Versturen..." : `Facturen versturen (${selectedMemberIds.length})`}
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                Export Excel
              </Button>
            </div>
          </section>

          <section className="overflow-x-auto rounded-lg border border-orange-100">
            <table className="min-w-full divide-y divide-orange-100">
              {!isDetailedView ? (
                <>
                  {renderMemberTableHeader()}
                  <tbody className="divide-y divide-orange-100">
                    {members.map((member) => renderMemberRow(member))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead className="bg-orange-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="p-2">Selectie</th>
                      <th className="p-2">Lidnr</th>
                      <th className="p-2">Lid sinds</th>
                      <th className="p-2">Groep</th>
                      <th className="p-2">Titel</th>
                      <th className="p-2">Voorletters</th>
                      <th className="p-2">Tussen</th>
                      <th className="p-2">Achternaam</th>
                      <th className="p-2">Voornaam</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Telefoon</th>
                      <th className="p-2">Mobiel</th>
                      <th className="p-2">Adres</th>
                      <th className="p-2">Postcode</th>
                      <th className="p-2">Plaats</th>
                      <th className="p-2">Lidmaatschap</th>
                      <th className="p-2">Bedrag</th>
                      <th className="p-2">Custom</th>
                      <th className="p-2">Cyclus</th>
                      <th className="p-2">Laatste factuur</th>
                      <th className="p-2">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    {members.map((member) => renderDetailedRow(member))}
                  </tbody>
                </>
              )}
            </table>
            {members.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">Nog geen leden beschikbaar.</div>
            )}
          </section>
        </CardContent>
      </Card>

      {showAddMember && (
        <MemberModal
          title="Nieuw lid toevoegen"
          confirmLabel="Opslaan"
          membershipPlans={membershipPlans}
          formState={formState}
          setFormState={setFormState}
          onClose={closeModals}
          onSubmit={handleCreateMember}
        />
      )}

      {showEditMemberId && (
        <MemberModal
          title="Lid bewerken"
          confirmLabel="Bijwerken"
          membershipPlans={membershipPlans}
          formState={formState}
          setFormState={setFormState}
          onClose={closeModals}
          onSubmit={handleUpdateMember}
          hideMembershipSelection
        />
      )}

      {showChangeMembershipId && (
        <MembershipModal
          title="Lidmaatschap wijzigen"
          membershipPlans={membershipPlans}
          formState={formState}
          setFormState={setFormState}
          onClose={closeModals}
          onSubmit={handleChangeMembership}
        />
      )}
    </div>
  )
}
interface ModalProps {
  title: string
  confirmLabel?: string
  membershipPlans: MembershipPlan[]
  formState: MemberFormState
  setFormState: Dispatch<SetStateAction<MemberFormState>>
  onClose: () => void
  onSubmit: (event: FormEvent) => void
  hideMembershipSelection?: boolean
}

function MemberModal({
  title,
  confirmLabel = "Opslaan",
  membershipPlans,
  formState,
  setFormState,
  onClose,
  onSubmit,
  hideMembershipSelection = false,
}: ModalProps) {
  const selectedPlan = membershipPlans.find((plan) => plan.id === formState.membershipId)
  const isCustomPlan = formState.membershipId === "custom" || selectedPlan?.type === "custom"
  const isNoInvoiceSelected = isCustomPlan && isNoInvoiceAmount(formState.customAmount)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-orange-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
          <section className="grid gap-4 md:grid-cols-3">
            <InputField label="Titel" value={formState.title ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, title: value || undefined }))} placeholder="Dhr./Mevr." />
            <InputField label="Voorletters" value={formState.initials ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, initials: value || undefined }))} placeholder="J.A." />
            <InputField label="Tussenvoegsel" value={formState.middleName ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, middleName: value || undefined }))} placeholder="van der" />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Voornaam*"
              value={formState.firstName}
              onChange={(value) => setFormState((prev) => ({ ...prev, firstName: value }))}
              required
            />
            <InputField
              label="Achternaam*"
              value={formState.lastName}
              onChange={(value) => setFormState((prev) => ({ ...prev, lastName: value }))}
              required
            />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <InputField
              label="Email*"
              type="email"
              value={formState.email}
              onChange={(value) => setFormState((prev) => ({ ...prev, email: value }))}
              required
            />
            <InputField label="Telefoon" value={formState.phone ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, phone: value || undefined }))} />
            <InputField label="Mobiel" value={formState.mobile ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, mobile: value || undefined }))} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <InputField label="Adres" value={formState.address ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, address: value || undefined }))} />
            <InputField label="Postcode" value={formState.postalCode ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, postalCode: value || undefined }))} />
            <InputField label="Plaats" value={formState.city ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, city: value || undefined }))} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <InputField label="Groep/Bedrijf" value={formState.groupName ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, groupName: value || undefined }))} />
            <InputField label="Sport" value={formState.sport ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, sport: value || undefined }))} />
            <InputField label="Lid sinds" type="date" value={formState.joinDate ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, joinDate: value || undefined }))} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InputField label="Achtergrond" value={formState.background ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, background: value || undefined }))} />
            <InputField label="Opmerkingen" value={formState.notes ?? ""} onChange={(value) => setFormState((prev) => ({ ...prev, notes: value || undefined }))} />
          </section>

          {!hideMembershipSelection && (
            <section className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="membership-select" className="text-sm font-medium text-gray-700">
                  Lidmaatschap*
                </Label>
                <select
                  id="membership-select"
                  value={formState.membershipId}
                  onChange={(event) => {
                    const value = event.target.value
                    if (value === "custom") {
                      setFormState((prev) => ({
                        ...prev,
                        membershipId: "custom",
                        isCustomMembership: true,
                        membershipCustomName: "Custom",
                        customAmount: 0,
                        billingCycle: prev.billingCycle || new Date().getFullYear().toString(),
                      }))
                    } else {
                      const plan = membershipPlans.find((item) => item.id === value)
                      setFormState((prev) => ({
                        ...prev,
                        membershipId: value,
                        isCustomMembership: false,
                        membershipCustomName: plan?.displayName ?? prev.membershipCustomName,
                        customAmount: plan?.amount,
                        billingCycle: plan?.billingCycle ?? prev.billingCycle,
                      }))
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-orange-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="" disabled>
                    Kies een lidmaatschap
                  </option>
                  {membershipPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.displayName} ({formatCurrency(plan.amount)})
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
              </div>

              <InputField
                label="Bedrag"
                type="number"
                value={isCustomPlan ? (formState.customAmount?.toString() ?? "") : (selectedPlan?.amount?.toString() ?? "")}
                onChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    customAmount: value ? Number.parseFloat(value) : undefined,
                  }))
                }
                placeholder={isCustomPlan ? "Vul bedrag in" : ""}
                disabled={!isCustomPlan}
              />
            </section>
          )}

          {isCustomPlan && (
            <section className="mb-4">
              <InputField
                label="Aangepaste lidmaatschapsnaam"
                value={formState.membershipCustomName ?? ""}
                onChange={(value) => setFormState((prev) => ({ ...prev, membershipCustomName: value || undefined }))}
                placeholder="Bijv. Sponsor Goud"
              />
            </section>
          )}

          {isCustomPlan && (

            <div className="flex items-center gap-3 rounded-md border border-orange-100 bg-orange-50 px-3 py-2">

              <input

                id="no-invoice-toggle-member"

                type="checkbox"

                className="h-4 w-4 rounded border-orange-300 text-orange-600"

                checked={isNoInvoiceSelected}

                onChange={(event) => {

                  const checked = event.target.checked

                  setFormState((prev) => {

                    if (checked) {

                      return {

                        ...prev,

                        customAmount: 0,

                        membershipCustomName: NO_INVOICE_LABEL,

                      }

                    }

                    const fallbackAmount = selectedPlan?.amount ?? undefined

                    const fallbackName = (

                      prev.membershipCustomName === NO_INVOICE_LABEL

                        ? selectedPlan?.displayName ?? prev.membershipCustomName

                        : prev.membershipCustomName

                    )

                    return {

                      ...prev,

                      customAmount: fallbackAmount,

                      membershipCustomName: fallbackName,

                    }

                  })

                }}

              />

              <Label htmlFor="no-invoice-toggle-member" className="text-sm text-gray-700">

                {NO_INVOICE_LABEL} (geen factuur)

              </Label>

            </div>

          )}



          <div className="flex justify-end gap-3 border-t border-orange-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600">
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface MembershipModalProps extends Omit<ModalProps, "hideMembershipSelection" | "confirmLabel"> {}

function MembershipModal({ title, membershipPlans, formState, setFormState, onClose, onSubmit }: MembershipModalProps) {
  const selectedPlan = membershipPlans.find((plan) => plan.id === formState.membershipId)
  const isCustomPlan = formState.membershipId === "custom" || selectedPlan?.type === "custom"
  const isNoInvoiceSelected = isCustomPlan && isNoInvoiceAmount(formState.customAmount)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-orange-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="membership-select" className="text-sm font-medium text-gray-700">
              Nieuw lidmaatschap*
            </Label>
            <select
              id="membership-select"
              value={formState.membershipId}
              onChange={(event) => {
                const value = event.target.value
                if (value === "custom") {
                  setFormState((prev) => ({
                    ...prev,
                    membershipId: "custom",
                    isCustomMembership: true,
                    membershipCustomName: "Custom",
                    customAmount: 0,
                    billingCycle: prev.billingCycle || new Date().getFullYear().toString(),
                  }))
                } else {
                  const plan = membershipPlans.find((item) => item.id === value)
                  setFormState((prev) => ({
                    ...prev,
                    membershipId: value,
                    isCustomMembership: false,
                    membershipCustomName: plan?.displayName ?? prev.membershipCustomName,
                    customAmount: plan?.amount,
                    billingCycle: plan?.billingCycle ?? prev.billingCycle,
                  }))
                }
              }}
              className="w-full rounded-md border border-orange-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              required
            >
              <option value="" disabled>
                Kies een lidmaatschap
              </option>
              {membershipPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.displayName} ({formatCurrency(plan.amount)})
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>

          <InputField
            label="Bedrag"
            type="number"
            value={isCustomPlan ? (formState.customAmount?.toString() ?? "") : (selectedPlan?.amount?.toString() ?? "")}
            onChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                customAmount: value ? Number.parseFloat(value) : undefined,
              }))
            }
            placeholder={isCustomPlan ? "Vul bedrag in" : ""}
            disabled={!isCustomPlan}
          />

          {isCustomPlan && (
            <InputField
              label="Aangepaste lidmaatschapsnaam"
              value={formState.membershipCustomName ?? ""}
              onChange={(value) => setFormState((prev) => ({ ...prev, membershipCustomName: value || undefined }))}
              placeholder="Bijv. Sponsor Goud"
            />
          )}

          {isCustomPlan && (
            <div className="flex items-center gap-3 rounded-md border border-orange-100 bg-orange-50 px-3 py-2">
              <input
                id="no-invoice-toggle-change"
                type="checkbox"
                className="h-4 w-4 rounded border-orange-300 text-orange-600"
                checked={isNoInvoiceSelected}
                onChange={(event) => {
                  const checked = event.target.checked
                  setFormState((prev) => {
                    if (checked) {
                      return {
                        ...prev,
                        customAmount: 0,
                        membershipCustomName: NO_INVOICE_LABEL,
                      }
                    }
                    const fallbackAmount = selectedPlan?.amount ?? undefined
                    const fallbackName = (
                      prev.membershipCustomName === NO_INVOICE_LABEL
                        ? selectedPlan?.displayName ?? prev.membershipCustomName
                        : prev.membershipCustomName
                    )
                    return {
                      ...prev,
                      customAmount: fallbackAmount,
                      membershipCustomName: fallbackName,
                    }
                  })
                }}
              />
              <Label htmlFor="no-invoice-toggle-change" className="text-sm text-gray-700">
                {NO_INVOICE_LABEL} (geen factuur)
              </Label>
            </div>
          )}

          <InputField
            label="Facturatiecyclus"
            value={formState.billingCycle ?? ""}
            onChange={(value) => setFormState((prev) => ({ ...prev, billingCycle: value || undefined }))}
            placeholder="Bijv. 2025"
          />

          <div className="flex justify-end gap-3 border-t border-orange-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" className="bg-orange-500 text-white hover:bg-orange-600">
              Opslaan
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-orange-600">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  disabled?: boolean
}

function InputField({ label, value, onChange, placeholder, type = "text", required = false, disabled = false }: InputFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-orange-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
      />
    </div>
  )
}





















