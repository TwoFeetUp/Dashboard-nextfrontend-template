'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Check, X, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { PendingPermission } from '@/lib/types'

interface PermissionMessageProps {
  permission: PendingPermission
  status: 'pending' | 'approved' | 'denied'
  onApprove?: (permissionId: string) => Promise<void>
  onDeny?: (permissionId: string) => Promise<void>
}

// Human-readable tool name mapping
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  manage_event: 'Event beheren',
  manage_customer: 'Klant beheren',
  update_event_status: 'Event status wijzigen',
  add_note: 'Notitie toevoegen',
  delete_event: 'Event verwijderen',
}

// Tool action descriptions
const TOOL_DESCRIPTIONS: Record<string, string> = {
  manage_event: 'Een event aanmaken of wijzigen in MICE Operations',
  manage_customer: 'Klantgegevens aanmaken of wijzigen in MICE Operations',
  update_event_status: 'De status van een event wijzigen',
  add_note: 'Een notitie toevoegen aan een event',
  delete_event: 'Een event permanent verwijderen uit MICE Operations',
}

// Format tool arguments for display
function formatToolArgs(args: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      key: key.replace(/_/g, ' '),
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
    }))
}

export function PermissionMessage({
  permission,
  status,
  onApprove,
  onDeny,
}: PermissionMessageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'deny' | null>(null)

  const displayName = TOOL_DISPLAY_NAMES[permission.toolName] || permission.toolName
  const description = TOOL_DESCRIPTIONS[permission.toolName] || `Tool: ${permission.toolName}`
  const formattedArgs = formatToolArgs(permission.toolArgs)

  const isDestructive = permission.toolName === 'delete_event'

  const handleApprove = async () => {
    if (!onApprove) return
    setIsLoading(true)
    setAction('approve')
    try {
      await onApprove(permission.permissionId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeny = async () => {
    if (!onDeny) return
    setIsLoading(true)
    setAction('deny')
    try {
      await onDeny(permission.permissionId)
    } finally {
      setIsLoading(false)
    }
  }

  // Approved state
  if (status === 'approved') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-green-600">Goedgekeurd</span>
        </div>
      </div>
    )
  }

  // Denied state
  if (status === 'denied') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle className="h-4 w-4" />
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-red-600">Geweigerd</span>
        </div>
      </div>
    )
  }

  // Pending state - show full card with approve/deny buttons
  return (
    <div className={`rounded-lg border-2 p-4 space-y-3 ${
      isDestructive
        ? 'border-red-300 bg-red-50/50'
        : 'border-amber-300 bg-amber-50/50'
    }`}>
      <div className="flex items-center gap-2">
        <ShieldAlert className={`h-5 w-5 ${isDestructive ? 'text-red-500' : 'text-amber-500'}`} />
        <span className="font-semibold text-sm">Toestemming vereist</span>
      </div>

      <div>
        <p className="font-medium text-sm">{displayName}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {formattedArgs.length > 0 && (
        <div className="rounded-md bg-white/60 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Parameters
          </p>
          <dl className="space-y-1 text-sm">
            {formattedArgs.map(({ key, value }) => (
              <div key={key} className="flex gap-2">
                <dt className="font-medium capitalize min-w-[80px]">{key}:</dt>
                <dd className="text-muted-foreground break-all">
                  {value.length > 100 ? (
                    <details className="cursor-pointer">
                      <summary className="text-xs text-blue-600 hover:underline">
                        Toon volledige waarde
                      </summary>
                      <pre className="mt-1 text-xs whitespace-pre-wrap">{value}</pre>
                    </details>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {isDestructive && (
        <div className="rounded-md bg-red-100 p-2 text-sm text-red-700">
          Let op: Deze actie kan niet ongedaan worden gemaakt.
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeny}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading && action === 'deny' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <X className="h-4 w-4 mr-1" />
          )}
          Weigeren
        </Button>
        <Button
          variant={isDestructive ? 'destructive' : 'default'}
          size="sm"
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading && action === 'approve' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          Toestaan
        </Button>
      </div>
    </div>
  )
}
