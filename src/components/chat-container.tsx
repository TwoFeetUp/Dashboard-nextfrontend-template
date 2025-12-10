'use client'

import { useEffect, useMemo } from 'react'
import { Brain, Loader2 } from 'lucide-react'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import DragDropZone from './drag-drop-zone'
import ChatInput from './chat-input'
import ChatMessage from './chat-message'
import { NewChatSuggestions } from './new-chat-suggestions'
import type { Message, DocumentAttachment } from '../lib/types'

interface ChatContainerProps {
  messages: Message[]
  input: string
  setInput: (value: string) => void
  sendMessage: (contentOverride?: string) => void
  isLoading: boolean
  documents: DocumentAttachment[]
  onFileSelect: (files: FileList) => void
  onRemoveDocument: (id: string) => void
  onFilesDropped: (files: FileList) => void
  uploadError: string | null
  placeholder?: {
    title?: string
    subtitle?: string
    icon?: React.ReactNode
  }
  enableVoice?: boolean
  enableOCR?: boolean
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
  accentColor?: string
  textColor?: string
  onApprovePermission?: (permissionId: string) => Promise<void>
  onDenyPermission?: (permissionId: string) => Promise<void>
}

export default function ChatContainer({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  documents,
  onFileSelect,
  onRemoveDocument,
  onFilesDropped,
  uploadError,
  placeholder = {
    title: "I'm here to help",
    subtitle: "Ask me anything or drop a file to get started",
    icon: <Brain className="h-8 w-8 text-primary" />
  },
  enableVoice = true,
  enableOCR = true,
  suggestions = [],
  onSuggestionClick,
  accentColor = '#a1d980',
  textColor = '#1a1a1a',
  onApprovePermission,
  onDenyPermission,
}: ChatContainerProps) {
  const { 
    containerRef: messagesContainerRef, 
    scrollToBottom, 
    handleScroll, 
    resetUserScrolling 
  } = useAutoScroll({
    dependencies: [messages],
    threshold: 100
  })

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      resetUserScrolling()
      setTimeout(() => scrollToBottom(), 50)
    }
  }, [messages, resetUserScrolling, scrollToBottom])

  const handleSuggestionSelection = (suggestion: string) => {
    resetUserScrolling()
    onSuggestionClick?.(suggestion)
  }

  const messageList = useMemo(() => {
    if (messages.length === 0) {
      return null
    }

    const showAssistantLoader = isLoading && messages[messages.length - 1]?.role !== 'assistant'

    return (
      <div className="space-y-3 pb-4 max-w-full overflow-hidden">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isStreaming={isLoading && index === messages.length - 1}
            isLatest={index === messages.length - 1}
            accentColor={accentColor}
            textColor={textColor}
            onApprovePermission={onApprovePermission}
            onDenyPermission={onDenyPermission}
          />
        ))}
        {showAssistantLoader && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>
    )
  }, [messages, isLoading, accentColor, textColor, onApprovePermission, onDenyPermission])

  return (
    <div className="flex-1 border-r border-gray-200 flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#f6f6ed' }}>
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 min-h-0"
      >
        {messages.length === 0 ? (
          <NewChatSuggestions
            icon={placeholder.icon}
            title={placeholder.title}
            subtitle={placeholder.subtitle}
            suggestions={suggestions}
            onSelectSuggestion={handleSuggestionSelection}
          />
        ) : (
          messageList
        )}
      </div>
      
      <div className="flex-shrink-0 border-t border-border bg-white">
        <DragDropZone
          onFilesDropped={onFilesDropped}
          uploadError={uploadError}
          documents={documents}
          onRemoveDocument={onRemoveDocument}
        >
          <ChatInput
            value={input}
            onChange={setInput}
            onSendMessage={() => {
              resetUserScrolling()
              sendMessage()
            }}
            onFileSelect={enableOCR ? onFileSelect : () => {}}
            onTranscription={(text) => {}}
            isLoading={isLoading}
            enableVoice={enableVoice}
            accentColor={accentColor}
          />
        </DragDropZone>
      </div>
    </div>
  )
}
