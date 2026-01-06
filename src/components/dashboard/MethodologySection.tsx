"use client"

import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Info } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import type { ResearchMethodology } from "@/lib/dashboard-types"

interface MethodologySectionProps {
  summary?: string
  methodology?: ResearchMethodology
}

export function MethodologySection({ summary, methodology }: MethodologySectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!methodology || methodology.toolsUsed.length === 0) return null

  const successCount = methodology.toolsUsed.filter(t => t.success).length
  const totalTools = methodology.toolsUsed.length

  return (
    <div className="mt-3 border-t border-border/50 pt-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors">
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <Info className="h-3 w-3" />
          <span>Onderzoeksmethodologie</span>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3 text-xs">
          {/* One-sentence summary */}
          {summary && (
            <p className="text-muted-foreground italic pl-2 border-l-2 border-border">
              {summary}
            </p>
          )}

          {/* Tools summary */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium">{successCount}/{totalTools} tools</span>
            <span className="text-border">|</span>
            <span>{methodology.totalSourcesChecked} sources</span>
          </div>
          {/* Tools Used */}
          <div className="space-y-1.5">
            <p className="font-medium text-muted-foreground">Research Tools:</p>
            {methodology.toolsUsed.map((tool, i) => (
              <div key={i} className="flex items-center gap-2 pl-2">
                {tool.success ? (
                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
                <span className="font-medium">{tool.toolName}</span>
                <span className="text-muted-foreground">({tool.domain})</span>
                {tool.success && tool.resultsCount > 0 && (
                  <span className="text-muted-foreground">- {tool.resultsCount} results</span>
                )}
                {!tool.success && tool.errorMessage && (
                  <span className="text-red-400 truncate max-w-[200px]" title={tool.errorMessage}>
                    - {tool.errorMessage}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Analysis Steps */}
          {methodology.analysisSteps.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-medium text-muted-foreground">Analysis Steps:</p>
              <ol className="list-decimal list-inside pl-2 space-y-1 text-muted-foreground">
                {methodology.analysisSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Time taken */}
          <div className="flex items-center gap-1.5 text-muted-foreground pt-1 border-t border-border/30">
            <Clock className="h-3 w-3" />
            <span>Research completed in {methodology.timeTakenSeconds.toFixed(1)}s</span>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
