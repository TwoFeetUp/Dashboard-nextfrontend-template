"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ChatInputFormProps {
  onSubmit: (message: string) => Promise<void>
  isLoading: boolean
  placeholder: string
}

export function ChatInputForm({ onSubmit, isLoading, placeholder }: ChatInputFormProps) {
  const [localInput, setLocalInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!localInput?.trim() || isLoading) return

    const messageToSend = localInput
    setLocalInput('')
    await onSubmit(messageToSend)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      <div className="flex space-x-2">
        <Input
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={!localInput || !localInput.trim() || isLoading}
          className="bg-transparent hover:bg-[#f5b781] border border-gray-300 hover:border-[#f5b781] text-gray-600 hover:text-black transition-colors"
        >
          Verstuur
        </Button>
      </div>
    </form>
  )
}
