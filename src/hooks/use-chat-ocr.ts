'use client'

import { useState, useCallback } from 'react'
import type { Message, DocumentAttachment } from '../lib/types'

interface UseChatOCROptions {
  chatEndpoint?: string
  ocrEndpoint?: string
  transcribeEndpoint?: string
  onError?: (error: Error) => void
  onFileProcessed?: (file: File, result: any) => void
}

export function useChatOCR({
  chatEndpoint = '/api/chat',
  ocrEndpoint = '/api/ocr',
  transcribeEndpoint = '/api/transcribe',
  onError,
  onFileProcessed
}: UseChatOCROptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentAttachment[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          documents
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      // Handle SSE streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
        toolCalls: []
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      if (reader) {
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              
              try {
                const event = JSON.parse(data)
                
                if (event.type === 'content') {
                  assistantMessage.content += event.content
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: assistantMessage.content }
                        : msg
                    )
                  )
                } else if (event.type === 'tool_call') {
                  // Add or update tool call
                  const toolCall = event.toolCall
                  const existingIndex = assistantMessage.toolCalls?.findIndex(tc => tc.id === toolCall.id)
                  
                  if (existingIndex !== undefined && existingIndex >= 0) {
                    assistantMessage.toolCalls![existingIndex] = toolCall
                  } else {
                    assistantMessage.toolCalls?.push(toolCall)
                  }
                  
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, toolCalls: [...(assistantMessage.toolCalls || [])] }
                        : msg
                    )
                  )
                } else if (event.type === 'tool_result') {
                  // Update tool call with result
                  const toolCall = event.toolCall
                  const index = assistantMessage.toolCalls?.findIndex(tc => tc.id === toolCall.id)
                  
                  if (index !== undefined && index >= 0) {
                    assistantMessage.toolCalls![index] = toolCall
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { ...msg, toolCalls: [...(assistantMessage.toolCalls || [])] }
                          : msg
                      )
                    )
                  }
                }
              } catch (e) {
                console.error('Failed to parse SSE event:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      onError?.(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, documents, chatEndpoint, onError])

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error: null,
    documents,
    uploadError,
    handleFileSelect,
    handleFilesDropped,
    removeDocument,
    setDocuments
  }
}