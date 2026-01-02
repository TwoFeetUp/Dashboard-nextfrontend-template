'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CardConfig, DashboardCard } from '@/lib/dashboard-types'

interface CardConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: CardConfig) => Promise<void>
  initialConfig?: DashboardCard | null
  existingCardsCount: number
}

export function CardConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  existingCardsCount,
}: CardConfigModalProps) {
  const [title, setTitle] = useState('')
  const [researchTopic, setResearchTopic] = useState('')
  const [refreshFrequency, setRefreshFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily')
  const [customRefreshHours, setCustomRefreshHours] = useState<number>(24)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!initialConfig

  useEffect(() => {
    if (initialConfig) {
      setTitle(initialConfig.title)
      setResearchTopic(initialConfig.researchTopic)
      setRefreshFrequency(initialConfig.refreshFrequency)
      setCustomRefreshHours(initialConfig.customRefreshHours || 24)
    } else {
      setTitle('')
      setResearchTopic('')
      setRefreshFrequency('daily')
      setCustomRefreshHours(24)
    }
    setError(null)
  }, [initialConfig, isOpen])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Titel is verplicht')
      return
    }
    if (!researchTopic.trim()) {
      setError('Onderzoeksonderwerp is verplicht')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      const config: CardConfig = {
        title: title.trim(),
        researchTopic: researchTopic.trim(),
        refreshFrequency,
        customRefreshHours: refreshFrequency === 'custom' ? customRefreshHours : undefined,
        position: initialConfig?.position ?? existingCardsCount,
        isActive: true,
      }

      await onSave(config)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Kon kaart niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Kaart bewerken' : 'Nieuwe onderzoekskaart'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Pas de instellingen van deze onderzoekskaart aan.'
              : 'Configureer een nieuwe onderzoekskaart voor je dashboard.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Ski Gear Trends 2026"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="researchTopic">Onderzoeksonderwerp</Label>
            <Input
              id="researchTopic"
              value={researchTopic}
              onChange={(e) => setResearchTopic(e.target.value)}
              placeholder="Bijv. Do research on the best skiing gear for 2026"
              maxLength={500}
            />
            <p className="text-xs text-tfu-black/60">
              Beschrijf wat de AI moet onderzoeken. Wees specifiek voor betere resultaten.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refreshFrequency">Verversfrequentie</Label>
            <Select value={refreshFrequency} onValueChange={(v) => setRefreshFrequency(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Dagelijks</SelectItem>
                <SelectItem value="weekly">Wekelijks</SelectItem>
                <SelectItem value="custom">Aangepast</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {refreshFrequency === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customRefreshHours">Verversinterval (uren)</Label>
              <Input
                id="customRefreshHours"
                type="number"
                min={1}
                max={720}
                value={customRefreshHours}
                onChange={(e) => setCustomRefreshHours(parseInt(e.target.value) || 24)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-br from-tfu-purple to-tfu-blue hover:opacity-90 text-white"
          >
            {isSaving ? 'Opslaan...' : isEditing ? 'Opslaan' : 'Kaart aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
