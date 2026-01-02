'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AddCardButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function AddCardButton({ onClick, disabled }: AddCardButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-gradient-to-br from-tfu-purple to-tfu-blue hover:opacity-90 text-white font-bold shadow-tfu-md"
    >
      <Plus className="h-4 w-4 mr-2" />
      Kaart toevoegen
    </Button>
  )
}
