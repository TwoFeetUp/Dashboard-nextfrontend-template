'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardCard } from './DashboardCard'
import { CardConfigModal } from './CardConfigModal'
import { AddCardButton } from './AddCardButton'
import { Search } from 'lucide-react'
import type { DashboardCard as DashboardCardType, CardConfig } from '@/lib/dashboard-types'

const MAX_CARDS = 6

interface DashboardViewProps {
  userId: string
}

export function DashboardView({ userId }: DashboardViewProps) {
  const [cards, setCards] = useState<DashboardCardType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<DashboardCardType | null>(null)

  const loadCards = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`/api/dashboard/cards?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Kon kaarten niet laden')
      }
      const data = await response.json()
      setCards(data.cards || [])
    } catch (err: any) {
      console.error('Failed to load dashboard cards:', err)
      setError(err.message || 'Kon kaarten niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const handleCreateCard = async (config: CardConfig) => {
    const response = await fetch(`/api/dashboard/cards?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Kon kaart niet aanmaken')
    }

    await loadCards()
  }

  const handleUpdateCard = async (cardId: string, config: CardConfig) => {
    const response = await fetch(`/api/dashboard/cards/${cardId}?userId=${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Kon kaart niet bijwerken')
    }

    await loadCards()
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Weet je zeker dat je deze kaart wilt verwijderen?')) {
      return
    }

    const response = await fetch(`/api/dashboard/cards/${cardId}?userId=${userId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Kon kaart niet verwijderen')
    }

    await loadCards()
  }

  const handleRefreshCard = async (cardId: string) => {
    const response = await fetch(`/api/dashboard/cards/${cardId}/refresh?userId=${userId}`, {
      method: 'POST',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Kon kaart niet verversen')
    }
  }

  const handleSaveCard = async (config: CardConfig) => {
    if (editingCard) {
      await handleUpdateCard(editingCard.id, config)
    } else {
      await handleCreateCard(config)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-tfu-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-tfu-black/60 font-light">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal text-tfu-black">Research Dashboard</h2>
          <p className="text-tfu-black/60 font-light mt-1">
            AI-gestuurde onderzoekskaarten die automatisch worden bijgewerkt
          </p>
        </div>
        {cards.length < MAX_CARDS && (
          <AddCardButton onClick={() => setIsConfigModalOpen(true)} />
        )}
      </div>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-700 rounded-md p-4 text-sm">
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-tfu-grey shadow-tfu-sm">
          <Search className="h-12 w-12 text-tfu-purple/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-tfu-black mb-2">Geen onderzoekskaarten</h3>
          <p className="text-tfu-black/60 font-light mb-6 max-w-md mx-auto">
            Voeg je eerste onderzoekskaart toe om automatisch inzichten te verzamelen over
            onderwerpen die voor jou belangrijk zijn.
          </p>
          <AddCardButton onClick={() => setIsConfigModalOpen(true)} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <DashboardCard
              key={card.id}
              card={card}
              userId={userId}
              onEdit={() => {
                setEditingCard(card)
                setIsConfigModalOpen(true)
              }}
              onDelete={() => handleDeleteCard(card.id)}
              onRefresh={() => handleRefreshCard(card.id)}
            />
          ))}
        </div>
      )}

      <CardConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false)
          setEditingCard(null)
        }}
        onSave={handleSaveCard}
        initialConfig={editingCard}
        existingCardsCount={cards.length}
      />
    </div>
  )
}
