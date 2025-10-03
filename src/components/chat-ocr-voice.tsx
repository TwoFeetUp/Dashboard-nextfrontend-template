'use client'

import { useChatOCR } from '../hooks/use-chat-ocr'
import ChatContainer from './chat-container'

interface ChatOCRVoiceProps {
  // API Endpoints (optional - uses defaults if not provided)
  chatEndpoint?: string
  ocrEndpoint?: string
  transcribeEndpoint?: string
  
  // UI Customization
  placeholder?: {
    title?: string
    subtitle?: string
    icon?: React.ReactNode
  }
  
  // Feature flags
  enableOCR?: boolean
  enableVoice?: boolean
  enableDragDrop?: boolean
  
  // Callbacks
  onError?: (error: Error) => void
  onFileProcessed?: (file: File, result: any) => void
}

export function ChatOCRVoice({
  chatEndpoint = '/api/chat',
  ocrEndpoint = '/api/ocr',
  transcribeEndpoint = '/api/transcribe',
  placeholder,
  enableOCR = true,
  enableVoice = true,
  enableDragDrop = true,
  onError,
  onFileProcessed
}: ChatOCRVoiceProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    documents,
    uploadError,
    handleFileSelect,
    handleFilesDropped,
    removeDocument
  } = useChatOCR({
    chatEndpoint,
    ocrEndpoint,
    transcribeEndpoint,
    onError,
    onFileProcessed
  })

  return (
    <div className="flex h-screen w-full">
      <ChatContainer
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isLoading={isLoading}
        documents={documents}
        onFileSelect={enableOCR ? handleFileSelect : () => {}}
        onRemoveDocument={removeDocument}
        onFilesDropped={enableDragDrop ? handleFilesDropped : () => {}}
        uploadError={uploadError}
        placeholder={placeholder}
        enableVoice={enableVoice}
        enableOCR={enableOCR}
      />
    </div>
  )
}

// Export individual components for flexibility
export { default as ChatContainer } from './chat-container'
export { default as ChatInput } from './chat-input'
export { default as ChatMessage } from './chat-message'
export { default as DragDropZone } from './drag-drop-zone'
export { AudioRecorder } from './audio-recorder'