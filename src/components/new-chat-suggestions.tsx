"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface NewChatSuggestionsProps {
  icon?: ReactNode
  title?: string
  subtitle?: string
  suggestions?: string[]
  onSelectSuggestion?: (suggestion: string) => void
}

export function NewChatSuggestions({
  icon,
  title,
  subtitle,
  suggestions = [],
  onSelectSuggestion,
}: NewChatSuggestionsProps) {
  const hasSuggestions = suggestions.length > 0

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6">
      {icon && (
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
      )}
      {title && <p className="text-muted-foreground font-medium">{title}</p>}
      {subtitle && (
        <p className="text-sm text-muted-foreground max-w-md">
          {subtitle}
        </p>
      )}
      {hasSuggestions && (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              className="justify-start h-auto py-3 text-left whitespace-normal"
              onClick={() => onSelectSuggestion?.(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
