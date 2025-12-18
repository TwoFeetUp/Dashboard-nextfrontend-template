'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

// Human-readable Dutch tool names for MICE Operations
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Read tools (auto-approved)
  find_events: 'Events zoeken',
  get_event_details: 'Event details ophalen',
  find_customer: 'Klant zoeken',
  get_customer_details: 'Klantgegevens ophalen',
  get_event_notes: 'Event notities ophalen',
  list_venues: 'Locaties ophalen',
  list_event_types: 'Event types ophalen',
  list_products: 'Producten ophalen',
  // Write tools (require permission)
  manage_event: 'Event beheren',
  manage_customer: 'Klant beheren',
  update_event_status: 'Event status wijzigen',
  add_note: 'Notitie toevoegen',
  delete_event: 'Event verwijderen',
}

type ToolCallStatus = 'calling' | 'completed' | 'error'

type ToolCallPayload = {
  id?: string
  toolName?: string
  tool_name?: string
  status?: ToolCallStatus
  result?: unknown
  args?: unknown
  arguments?: unknown
  rawArgs?: unknown
}

interface ToolCallDisplayProps {
  toolCall: ToolCallPayload
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const status: ToolCallStatus = toolCall.status ?? 'calling'

  const callArguments = useMemo(() => {
    const args = toolCall.args ?? toolCall.arguments ?? toolCall.rawArgs
    if (!args) return null
    if (typeof args === 'string') {
      try {
        return JSON.parse(args)
      } catch {
        return args
      }
    }
    return args
  }, [toolCall.args, toolCall.arguments, toolCall.rawArgs])

  const resolvedResult = useMemo(() => {
    if (toolCall.result === undefined) return undefined
    if (toolCall.result === null) return null
    if (typeof toolCall.result === 'string') {
      const trimmed = toolCall.result.trim()
      if (!trimmed) return ''
      try {
        return JSON.parse(trimmed)
      } catch {
        if (trimmed.startsWith('ToolReturnPart(')) {
          const toolMatch = trimmed.match(/tool_name='([^']*)'/)
          const contentIndex = trimmed.indexOf('content=')
          const contentQuote = contentIndex >= 0 ? trimmed.indexOf("'", contentIndex) : -1
          if (contentQuote >= 0) {
            let value = ''
            let escaping = false
            for (let i = contentQuote + 1; i < trimmed.length; i++) {
              const char = trimmed[i]
              if (escaping) {
                value += char
                escaping = false
                continue
              }
              if (char === '\\') {
                escaping = true
                continue
              }
              if (char === "'") {
                break
              }
              value += char
            }
            try {
              return {
                tool_name: toolMatch?.[1],
                content: JSON.parse(`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
              }
            } catch {
              return {
                tool_name: toolMatch?.[1],
                content: value
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\'/g, "'")
                  .replace(/\\\\/g, '\\')
              }
            }
          }
        }
        return { content: trimmed }
      }
    }
    return toolCall.result
  }, [toolCall.result])

  const resolvedName = useMemo(() => {
    const candidates: Array<unknown> = [
      toolCall.toolName,
      (typeof toolCall === 'object' && toolCall && 'tool_name' in toolCall)
        ? (toolCall as { tool_name?: unknown }).tool_name
        : undefined,
    ]
    if (toolCall.result && typeof toolCall.result === 'object' && 'tool_name' in (toolCall.result as Record<string, unknown>)) {
      candidates.push((toolCall.result as { tool_name?: unknown }).tool_name)
    }
    if (resolvedResult && typeof resolvedResult === 'object' && 'tool_name' in (resolvedResult as Record<string, unknown>)) {
      candidates.push((resolvedResult as { tool_name?: unknown }).tool_name)
    }
    const found = candidates.find(value => typeof value === 'string' && value.trim().length > 0)
    return typeof found === 'string' ? found : undefined
  }, [toolCall, resolvedResult])

  const displayName = useMemo(() => {
    const name = resolvedName ?? 'unknown_tool'
    // Check for known MICE tools first
    if (TOOL_DISPLAY_NAMES[name]) {
      return TOOL_DISPLAY_NAMES[name]
    }
    // Fallback to generic transformation
    if (name === 'unknown_tool') return 'Unknown tool'
    if (name === 'getCurrentTime') return 'Get Current Time'
    const readable = name
      .replace(/([_-]+)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!readable) return 'Tool call'
    return readable
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }, [resolvedName])

  const icon = useMemo(() => {
    switch (status) {
      case 'calling':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }, [status])

  const formatJson = (value: unknown) => {
    if (value === undefined || value === null) {
      return '—'
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }

    return JSON.stringify(value, null, 2)
  }

  if (status === 'calling') {
    return (
      <div className="block w-full my-1">
        <div className="flex w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-left text-xs">
          {icon}
          <span className="min-w-0 flex-1 truncate text-blue-700">{displayName}</span>
        </div>
      </div>
    )
  }

  const hasDetails = Boolean(callArguments) || resolvedResult !== undefined

  return (
    <div className="block w-full my-1">
      <button
        type="button"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors w-full text-left border ${
          status === 'completed'
            ? 'bg-green-50 hover:bg-green-100 border-green-200'
            : 'bg-red-50 hover:bg-red-100 border-red-200'
        } ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {icon}
        <span className={`min-w-0 flex-1 font-medium truncate ${
          status === 'completed' ? 'text-green-700' : 'text-red-700'
        }`}>
          {displayName}
        </span>
        {hasDetails && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 text-[10px]">
              {isExpanded ? 'hide' : 'show'} details
            </span>
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </>
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="mt-1 w-full max-w-full overflow-hidden rounded-md border border-gray-200 bg-white p-2 pl-5 shadow-sm space-y-2">
          <div className="rounded border border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 px-3 py-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Tool call</span>
            </div>
            <div className="px-3 py-2 space-y-2">
              <div className="text-[11px] text-gray-500">
                <span className="font-medium text-gray-700">Name:</span> {displayName}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Arguments</div>
                <div className="rounded bg-white border border-gray-200 p-2">
                  <pre className="text-[11px] leading-4 text-gray-700 whitespace-pre-wrap break-words">
                    {callArguments ? formatJson(callArguments) : 'No arguments provided'}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {resolvedResult !== undefined && (
            <div className="rounded border border-gray-200 bg-gray-50">
              <div className="border-b border-gray-200 px-3 py-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Result</span>
              </div>
              <div className="px-3 py-2">
                {status === 'error' && typeof resolvedResult === 'object' && resolvedResult !== null && 'error' in (resolvedResult as Record<string, unknown>) ? (
                  <div className="text-xs text-red-600">
                    Error: {(resolvedResult as { error?: string }).error ?? 'Unknown error'}
                  </div>
                ) : (
                  <div className="rounded bg-white border border-gray-200 p-2 max-h-48 overflow-auto">
                    <pre className="text-[11px] leading-4 text-gray-700 whitespace-pre-wrap break-words">
                      {formatJson(resolvedResult)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
