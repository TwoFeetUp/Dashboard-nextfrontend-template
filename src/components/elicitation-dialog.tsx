'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ElicitationRequest } from '@/lib/types'

interface ElicitationDialogProps {
  elicitation: ElicitationRequest
  onRespond: (
    elicitationId: string,
    action: 'accept' | 'decline' | 'cancel',
    content?: Record<string, unknown>
  ) => Promise<void>
  accentColor?: string
  textColor?: string
}

// Amber/brown color for DELETE confirmation
const DELETE_CONFIRM_COLOR = '#946e51'

export function ElicitationDialog({
  elicitation,
  onRespond,
  accentColor = '#a1d980',
  textColor = '#1a1a1a'
}: ElicitationDialogProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1)

  // Detect DELETE operations via message text
  const isDeleteOperation = elicitation.message.toLowerCase().includes('verwijder') ||
                            elicitation.message.toLowerCase().includes('delete')

  // Check if schema requires input fields
  const hasSchema = elicitation.requestedSchema &&
    typeof elicitation.requestedSchema === 'object' &&
    Object.keys(elicitation.requestedSchema).length > 0

  const schemaProperties = hasSchema && elicitation.requestedSchema?.properties
    ? (elicitation.requestedSchema.properties as Record<string, { type?: string; description?: string }>)
    : null

  const handleResponse = async (action: 'accept' | 'decline' | 'cancel') => {
    // For DELETE operations on step 1, go to confirmation step instead of submitting
    if (isDeleteOperation && action === 'accept' && confirmationStep === 1) {
      setConfirmationStep(2)
      return
    }

    setIsResponding(true)
    try {
      const content = action === 'accept' && schemaProperties
        ? formData
        : undefined
      await onRespond(elicitation.id, action, content)
    } finally {
      setIsResponding(false)
    }
  }

  const handleBack = () => {
    setConfirmationStep(1)
  }

  // Step 2: DELETE confirmation UI
  if (isDeleteOperation && confirmationStep === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
          {/* Header - amber tinted */}
          <div
            className="rounded-t-lg px-6 py-4"
            style={{ backgroundColor: `${DELETE_CONFIRM_COLOR}22` }}
          >
            <h3 className="text-lg font-semibold text-lht-black">
              Weet je het zeker?
            </h3>
            <p className="text-sm text-lht-black/60">
              Deze actie kan niet ongedaan worden gemaakt
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="whitespace-pre-wrap text-sm text-lht-black">
              {elicitation.message}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-lht-black/10 px-6 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={isResponding}
            >
              Terug
            </Button>
            <Button
              size="sm"
              onClick={() => handleResponse('accept')}
              disabled={isResponding}
              style={{
                backgroundColor: DELETE_CONFIRM_COLOR,
                borderColor: DELETE_CONFIRM_COLOR,
                color: '#ffffff'
              }}
              className="border transition-all duration-200 hover:shadow-md hover:opacity-80"
            >
              {isResponding ? 'Bezig...' : 'Definitief verwijderen'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Standard permission UI
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div
          className="rounded-t-lg px-6 py-4"
          style={{ backgroundColor: `${accentColor}33` }}
        >
          <h3 className="text-lg font-semibold text-lht-black">
            Bevestiging vereist
          </h3>
          <p className="text-sm text-lht-black/60">
            Mickey Mice vraagt om toestemming
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="whitespace-pre-wrap text-sm text-lht-black">
            {elicitation.message}
          </div>

          {/* Input fields if schema requires them */}
          {schemaProperties && (
            <div className="mt-4 space-y-3">
              {Object.entries(schemaProperties).map(([key, prop]) => (
                <div key={key}>
                  <Label htmlFor={key} className="text-sm text-lht-black">
                    {prop.description || key}
                  </Label>
                  <Input
                    id={key}
                    type={prop.type === 'number' || prop.type === 'integer' ? 'number' : 'text'}
                    value={formData[key] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      [key]: e.target.value
                    }))}
                    className="mt-1"
                    disabled={isResponding}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-lht-black/10 px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResponse('cancel')}
            disabled={isResponding}
          >
            Annuleren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleResponse('decline')}
            disabled={isResponding}
          >
            Weigeren
          </Button>
          <Button
            size="sm"
            onClick={() => handleResponse('accept')}
            disabled={isResponding}
            style={{
              backgroundColor: accentColor,
              borderColor: accentColor,
              color: textColor
            }}
            className="border transition-all duration-200 hover:shadow-md hover:opacity-80"
          >
            {isResponding ? 'Bezig...' : 'Goedkeuren'}
          </Button>
        </div>
      </div>
    </div>
  )
}
