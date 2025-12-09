'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Check, X, Loader2 } from 'lucide-react'
import type { PendingPermission } from '@/lib/types'

interface PermissionDialogProps {
  permission: PendingPermission
  onApprove: (permissionId: string) => Promise<void>
  onDeny: (permissionId: string) => Promise<void>
  apiBaseUrl?: string
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

export function PermissionDialog({
  permission,
  onApprove,
  onDeny,
  apiBaseUrl = '',
}: PermissionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'deny' | null>(null)

  const displayName = TOOL_DISPLAY_NAMES[permission.toolName] || permission.toolName
  const description = TOOL_DESCRIPTIONS[permission.toolName] || `Tool: ${permission.toolName}`
  const formattedArgs = formatToolArgs(permission.toolArgs)

  const isDestructive = permission.toolName === 'delete_event'

  const handleApprove = async () => {
    setIsLoading(true)
    setAction('approve')
    try {
      await onApprove(permission.permissionId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeny = async () => {
    setIsLoading(true)
    setAction('deny')
    try {
      await onDeny(permission.permissionId)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`h-5 w-5 ${isDestructive ? 'text-red-500' : 'text-amber-500'}`} />
          <CardTitle className="text-base font-semibold">
            Toestemming vereist
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="font-medium text-sm">{displayName}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {formattedArgs.length > 0 && (
          <div className="rounded-md bg-muted/50 p-3 space-y-1">
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
          <div className="rounded-md bg-red-100 dark:bg-red-900/30 p-2 text-sm text-red-700 dark:text-red-300">
            Let op: Deze actie kan niet ongedaan worden gemaakt.
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeny}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading && action === 'deny' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Toestaan
        </Button>
      </CardFooter>
    </Card>
  )
}
