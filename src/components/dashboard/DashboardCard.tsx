'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreVertical, RefreshCw, Pencil, Trash2, Clock, AlertCircle, Database, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CardContent as CardContentRenderer } from './CardContent'
import { CardLoadingState } from './CardLoadingState'
import type { DashboardCard as DashboardCardType, CardContent as CardContentType } from '@/lib/dashboard-types'

export type RefreshMode = 'data' | 'full'

interface DashboardCardProps {
  card: DashboardCardType
  userId: string
  onEdit: () => void
  onDelete: () => void
  onRefresh: (mode: RefreshMode) => Promise<void>
}

export function DashboardCard({ card, userId, onEdit, onDelete, onRefresh }: DashboardCardProps) {
  const [content, setContent] = useState<CardContentType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchContent = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/cards/${card.id}/content?userId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }
      const data = await response.json()
      setContent(data)
    } catch (error) {
      console.error('Failed to fetch card content:', error)
      setContent({
        htmlContent: '',
        isStale: false,
        isRefreshing: false,
        errorMessage: 'Kon content niet laden',
      })
    } finally {
      setIsLoading(false)
    }
  }, [card.id, userId])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  const handleRefresh = async (mode: RefreshMode = 'full') => {
    setIsRefreshing(true)
    try {
      await onRefresh(mode)
      // Re-fetch content after refresh
      await fetchContent()
    } finally {
      setIsRefreshing(false)
    }
  }

  const showLoading = isLoading || isRefreshing || content?.isRefreshing

  return (
    <Card className="bg-white border-tfu-grey shadow-tfu-md hover:shadow-tfu-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-tfu-black truncate pr-2">
          {card.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleRefresh('data')} disabled={isRefreshing}>
              <Database className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-pulse' : ''}`} />
              Data bijwerken
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRefresh('full')} disabled={isRefreshing}>
              <Search className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Opnieuw onderzoeken
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Bewerken
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-0">
        {showLoading ? (
          <CardLoadingState />
        ) : content?.errorMessage ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-600 mb-4">{content.errorMessage}</p>
            <Button variant="outline" size="sm" onClick={() => handleRefresh('full')}>
              Opnieuw proberen
            </Button>
          </div>
        ) : content?.htmlContent ? (
          <CardContentRenderer htmlContent={content.htmlContent} cardId={card.id} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <p className="text-sm text-tfu-black/60 mb-4">Geen data beschikbaar</p>
            <Button variant="outline" size="sm" onClick={() => handleRefresh('full')}>
              Onderzoek starten
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full text-xs text-tfu-black/60">
          {content?.isStale && !showLoading && (
            <span className="flex items-center text-tfu-orange">
              <Clock className="mr-1 h-3 w-3" />
              Verouderd
            </span>
          )}
          {content?.generatedAt && (
            <span className="ml-auto">
              {new Date(content.generatedAt).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
