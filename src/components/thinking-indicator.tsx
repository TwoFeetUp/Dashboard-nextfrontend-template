"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThinkingIndicatorProps {
  reasoning: string[]
  isThinking: boolean
  className?: string
}

export function ThinkingIndicator({ reasoning, isThinking, className }: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isThinking && reasoning.length === 0) {
    return null
  }

  return (
    <div className={cn("mb-4 rounded-lg border border-border/50 bg-muted/30", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        type="button"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Brain className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-muted-foreground">
          {isThinking ? "Thinking..." : "Reasoning"}
        </span>
        {isThinking && (
          <span className="ml-auto flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" />
          </span>
        )}
      </button>

      {isExpanded && reasoning.length > 0 && (
        <div className="border-t border-border/50 px-4 py-3">
          <div className="space-y-2">
            {reasoning.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                <span className="min-w-0 whitespace-pre-wrap break-words">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
