'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Message, DocumentAttachment } from '../lib/types'
import pb from '@/lib/pocketbase'
import { useAuth } from '@/hooks/use-auth'

interface UseChatOCREnhancedOptions {
  chatEndpoint?: string
  ocrEndpoint?: string
  transcribeEndpoint?: string
  conversationId?: string | null
  assistantType?: string
  onError?: (error: Error) => void
  onFileProcessed?: (file: File, result: any) => void
}

export function useChatOCREnhanced({
  chatEndpoint = '/api/chat-enhanced',
  ocrEndpoint = '/api/ocr',
  transcribeEndpoint = '/api/transcribe',
  conversationId,
  assistantType = 'general',
  onError,
  onFileProcessed
}: UseChatOCREnhancedOptions = {}) {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentAttachment[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Load existing messages from PocketBase when conversation changes
  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    
    try {
      const messages = await pb.collection('messages').getList(1, 100, {
        filter: `conversationId = "${conversationId}"`,
      })
      
      const loadedMessages: Message[] = messages.items.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))
      
      setMessages(loadedMessages)
    } catch (error: any) {
      console.error('Failed to load messages:', error)
      onError?.(error as Error)
      if (error?.status === 401) {
        await logout()
      }
    }
  }, [conversationId, logout, onError])

  useEffect(() => {
    if (conversationId && user) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [conversationId, user, loadMessages])

  // Handle file selection and OCR processing
  const handleFileSelect = useCallback(async (files: FileList) => {
    const newDocs: DocumentAttachment[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const id = `doc-${Date.now()}-${i}`
      
      // Create document attachment
      const doc: DocumentAttachment = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        uploadedAt: new Date()
      }
      
      newDocs.push(doc)
      
      // Read file as base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        const base64Content = base64.split(',')[1] // Remove data:type;base64, prefix
        
        // Update document status to processing
        setDocuments(prev => prev.map(d => 
          d.id === id ? { ...d, status: 'processing' as const, content: base64Content } : d
        ))
        
        try {
          // Send to OCR API
          const response = await fetch(ocrEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document: base64Content,
              filename: file.name,
              mimeType: file.type
            })
          })
          
          const result = await response.json()
          
          if (result.success) {
            // Update document with OCR result
            setDocuments(prev => prev.map(d => 
              d.id === id ? {
                ...d,
                status: 'ready' as const,
                ocrText: result.text,
                characterCount: result.characterCount,
                pageCount: result.pageCount,
                processedAt: new Date()
              } : d
            ))
            
            // Clear any previous error
            setUploadError(null)
            
            // Notify parent
            onFileProcessed?.(file, result)
          } else {
            // Remove the failed document and show error
            setDocuments(prev => prev.filter(d => d.id !== id))
            const errorMsg = result.error || 'Failed to process document'
            setUploadError(`${file.name}: ${errorMsg}`)
            // Auto-clear error after 5 seconds
            setTimeout(() => setUploadError(null), 5000)
          }
        } catch (error) {
          // Remove the failed document and show network error
          setDocuments(prev => prev.filter(d => d.id !== id))
          setUploadError(`${file.name}: Network error during upload`)
          // Auto-clear error after 5 seconds
          setTimeout(() => setUploadError(null), 5000)
          onError?.(error as Error)
        }
      }
      
      reader.readAsDataURL(file)
    }
    
    // Add new documents to state
    setDocuments(prev => [...prev, ...newDocs])
  }, [ocrEndpoint, onError, onFileProcessed])

  const handleFilesDropped = useCallback((files: FileList) => {
    handleFileSelect(files)
  }, [handleFileSelect])

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id))
  }, [])

  const sendMessage = useCallback(async (contentOverride?: string) => {
    const messageContent = (contentOverride ?? input).trim()
    if (!messageContent) return

    const authUserId = pb.authStore.model?.id
    if (!authUserId) {
      console.error('No authenticated user')
      await logout()
      return
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent
    }

    // Create a version with documents for the API, but show clean version in UI
    let messageWithDocsForAPI = { ...userMessage }
    if (documents.filter(d => d.status === 'ready').length > 0) {
      const docTexts = documents
        .filter(d => d.status === 'ready' && d.ocrText)
        .map(d => `[Document: ${d.name}]\n${d.ocrText}`)
        .join('\n\n')
      messageWithDocsForAPI.content = `${messageContent}\n\n---\nAttached Documents:\n${docTexts}`
    }

    // Add the clean message to UI (without document content)
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Send history without docs, only last message has docs
      const messagesForAPI = [...messages, messageWithDocsForAPI]

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesForAPI,
          conversationId,
          userId: authUserId,
          assistantType
        })
      })
      
      if (response.status === 401) {
        await logout()
        throw new Error('UNAUTHORIZED')
      }

      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      // Handle SSE streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (reader) {
        const assistantId = `msg-${Date.now() + 1}`
        let assistantMessage = ''
        
        // Add placeholder for assistant message
        setMessages(prev => [...prev, {
          id: assistantId,
          role: 'assistant',
          content: ''
        }])
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (!line.trim()) continue
            
            // Handle Server-Sent Events format
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              
              // Skip special messages
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                
                // Handle different event types
                if (parsed.type === 'text-delta' && parsed.delta) {
                  // Vercel AI SDK text delta
                  assistantMessage += parsed.delta
                } else if (parsed.type === 'error') {
                  console.error('Stream error:', parsed.errorText)
                  throw new Error(parsed.errorText || 'Stream error')
                } else if (parsed.type === 'start' || parsed.type === 'finish') {
                  // Metadata events, ignore
                  console.log('Stream event:', parsed.type)
                }
              } catch (e) {
                // If not JSON, might be direct text
                if (data && !data.startsWith('{')) {
                  assistantMessage += data
                }
              }
            }
            // Also handle the numbered format (0:, 1:, etc)
            else if (line.match(/^\d+:/)) {
              const colonIndex = line.indexOf(':')
              const content = line.slice(colonIndex + 1).trim()
              
              if (content) {
                try {
                  const parsed = JSON.parse(content)
                  if (typeof parsed === 'string') {
                    assistantMessage += parsed
                  }
                } catch (e) {
                  // Not JSON, use as-is
                  assistantMessage += content
                }
              }
            }
            
            // Update the message if we have content
            if (assistantMessage) {
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: assistantMessage }
                  : msg
              ))
            }
          }
        }
        
        // Don't clear documents - they should persist until manually removed
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      onError?.(error as Error)

      if (error?.message === 'UNAUTHORIZED') {
        return
      }
      
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Er is een fout opgetreden. Probeer het opnieuw.'
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, documents, chatEndpoint, conversationId, assistantType, onError, logout])

  return {
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
  }
}
