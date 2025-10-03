'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { ToolCall } from '../lib/tools'

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Get status icon and color
  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'calling':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }
  
  // Get friendly tool name
  const getToolDisplayName = (name: string) => {
    const names: Record<string, string> = {
      'getCurrentTime': '🕐 Get Current Time',
    }
    return names[name] || name
  }
  
  // Format the result for display
  const formatResult = () => {
    if (!toolCall.result) return null
    
    if (toolCall.status === 'error') {
      return (
        <div className="text-red-600 text-xs">
          Error: {toolCall.result.error || 'Unknown error'}
        </div>
      )
    }
    
    if (toolCall.toolName === 'getCurrentTime' && toolCall.result.formatted) {
      return (
        <div className="space-y-1 text-xs">
          <div className="text-gray-600">
            <span className="font-medium">Time:</span> {toolCall.result.formatted}
          </div>
          <div className="text-gray-500">
            <span className="font-medium">Timezone:</span> {toolCall.result.timezone}
          </div>
        </div>
      )
    }
    
    // Default: show JSON
    return (
      <pre className="text-xs text-gray-600 overflow-x-auto">
        {JSON.stringify(toolCall.result, null, 2)}
      </pre>
    )
  }
  
  if (toolCall.status === 'calling') {
    return (
      <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs my-1">
        {getStatusIcon()}
        <span className="text-blue-700">{getToolDisplayName(toolCall.toolName)}</span>
      </div>
    )
  }
  
  return (
    <div className="block w-full my-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors w-full text-left ${
          toolCall.status === 'completed' 
            ? 'bg-green-50 hover:bg-green-100 border border-green-200' 
            : 'bg-red-50 hover:bg-red-100 border border-red-200'
        }`}
      >
        {getStatusIcon()}
        <span className={`flex-1 font-medium ${
          toolCall.status === 'completed' ? 'text-green-700' : 'text-red-700'
        }`}>
          {getToolDisplayName(toolCall.toolName)}
        </span>
        {toolCall.result && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 text-[10px]">
              {isExpanded ? 'hide' : 'show'} details
            </span>
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </>
        )}
      </button>
      
      {isExpanded && toolCall.result && (
        <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 ml-5">
          {formatResult()}
        </div>
      )}
    </div>
  )
}