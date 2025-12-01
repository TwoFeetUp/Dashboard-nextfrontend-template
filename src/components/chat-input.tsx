'use client'

import { FormEvent } from 'react'
import { Button } from './ui/button'
import { AudioRecorder } from './audio-recorder'
import { FileUploadButton } from './file-upload-button'
import { Loader2, Send } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSendMessage: () => void
  onFileSelect: (files: FileList) => void
  onTranscription: (text: string) => void
  isLoading: boolean
  placeholder?: string
  enableVoice?: boolean
  accentColor?: string
}

export default function ChatInput({
  value,
  onChange,
  onSendMessage,
  onFileSelect,
  onTranscription,
  isLoading,
  placeholder = "Type a message or drop a file...",
  enableVoice = true,
  accentColor = '#a1d980'
}: ChatInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSendMessage()
  }

  const handleTranscription = (text: string) => {
    onChange(value ? `${value} ${text}` : text)
    onTranscription(text)
  }

  return (
    <div className="flex-shrink-0 bg-white p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              '--tw-ring-color': accentColor,
            } as React.CSSProperties}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accentColor
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}33`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.boxShadow = ''
            }}
          />
        </div>
        <FileUploadButton
          onFileSelect={onFileSelect}
          disabled={isLoading}
        />
        {enableVoice && (
          <AudioRecorder
            onTranscription={handleTranscription}
            onProcessAudio={async (audioBlob) => {
              const reader = new FileReader()
              const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(audioBlob)
              })
              const base64Audio = base64.split(',')[1]
              
              const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, language: 'nl' })
              })
              
              const data = await response.json()
              return { text: data.text || '' }
            }}
            disabled={isLoading}
            language="nl"
          />
        )}
        <Button
          type="submit"
          disabled={isLoading || !value?.trim()}
          size="sm"
          className="bg-transparent text-gray-600 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{
            '--hover-bg': accentColor,
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            if (!isLoading && value?.trim()) {
              e.currentTarget.style.backgroundColor = accentColor
              e.currentTarget.style.borderColor = accentColor
              e.currentTarget.style.color = 'black'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = ''
            e.currentTarget.style.borderColor = ''
            e.currentTarget.style.color = ''
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}