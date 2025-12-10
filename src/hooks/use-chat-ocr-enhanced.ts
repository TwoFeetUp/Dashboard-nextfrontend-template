'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Message, MessageEvent, DocumentAttachment, PendingPermission, ToolCall } from '../lib/types'
import pb from '@/lib/pocketbase'
import { useAuth } from '@/hooks/use-auth'

// Sanitize values for PocketBase filter queries to prevent injection
const sanitizeFilterValue = (value: string): string => {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

interface UseChatOCREnhancedOptions {
  chatEndpoint?: string
  ocrEndpoint?: string
  transcribeEndpoint?: string
  permissionEndpoint?: string  // Base URL for permission API (e.g., http://localhost:8000)
  conversationId?: string | null
  assistantType?: string
  onError?: (error: Error) => void
  onFileProcessed?: (file: File, result: any) => void
  onPermissionRequired?: (permission: PendingPermission) => void
}

export function useChatOCREnhanced({
  chatEndpoint = '/api/agent',
  ocrEndpoint = '/api/ocr',
  transcribeEndpoint = '/api/transcribe',
  permissionEndpoint = '',  // Empty = same origin as chatEndpoint
  conversationId,
  assistantType = 'general',
  onError,
  onFileProcessed,
  onPermissionRequired
}: UseChatOCREnhancedOptions = {}) {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentAttachment[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingPermissions, setPendingPermissions] = useState<PendingPermission[]>([])

  // Resolve permission API base URL from chat endpoint
  const getPermissionApiUrl = useCallback((permissionId: string) => {
    if (permissionEndpoint) {
      return `${permissionEndpoint}/api/permission/${permissionId}`
    }
    // Extract base URL from chatEndpoint (e.g., http://localhost:8000/chat/stream -> http://localhost:8000)
    try {
      const url = new URL(chatEndpoint, window.location.origin)
      return `${url.origin}/api/permission/${permissionId}`
    } catch {
      return `/api/permission/${permissionId}`
    }
  }, [chatEndpoint, permissionEndpoint])

  // Helper to update permission status in message timeline
  const updatePermissionInMessages = useCallback((permissionId: string, status: 'pending' | 'approved' | 'denied') => {
    setMessages(prev => prev.map(msg => {
      if (!msg.timeline) return msg
      const updatedTimeline = msg.timeline.map(event => {
        if (event.type === 'permission_request' && event.permission.permissionId === permissionId) {
          return { ...event, status }
        }
        return event
      })
      return { ...msg, timeline: updatedTimeline }
    }))
  }, [])

  // Approve a pending permission
  const approvePermission = useCallback(async (permissionId: string) => {
    try {
      // Update UI immediately for responsiveness
      updatePermissionInMessages(permissionId, 'approved')

      const response = await fetch(getPermissionApiUrl(permissionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      })
      if (!response.ok) {
        // Revert on error
        updatePermissionInMessages(permissionId, 'pending')
        throw new Error(`Failed to approve permission: ${response.statusText}`)
      }
      // Remove from pending list
      setPendingPermissions(prev => prev.filter(p => p.permissionId !== permissionId))
    } catch (error) {
      console.error('Error approving permission:', error)
      onError?.(error as Error)
    }
  }, [getPermissionApiUrl, onError, updatePermissionInMessages])

  // Deny a pending permission
  const denyPermission = useCallback(async (permissionId: string) => {
    try {
      // Update UI immediately for responsiveness
      updatePermissionInMessages(permissionId, 'denied')

      const response = await fetch(getPermissionApiUrl(permissionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false })
      })
      if (!response.ok) {
        // Revert on error
        updatePermissionInMessages(permissionId, 'pending')
        throw new Error(`Failed to deny permission: ${response.statusText}`)
      }
      // Remove from pending list
      setPendingPermissions(prev => prev.filter(p => p.permissionId !== permissionId))
    } catch (error) {
      console.error('Error denying permission:', error)
      onError?.(error as Error)
    }
  }, [getPermissionApiUrl, onError, updatePermissionInMessages])

  // Load existing messages from PocketBase when conversation changes
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      return
    }

    // Clear messages immediately when loading a new conversation
    setMessages([])

    try {
      const safeConversationId = sanitizeFilterValue(conversationId)
      const result = await pb.collection('messages').getList(1, 200, {
        filter: `conversationId = "${safeConversationId}"`,
        sort: 'created'
      })

      const loadedMessages: Message[] = result.items
        .filter(msg => msg.role !== 'tool') // Filter out tool return messages (internal)
        .map(msg => {
          // Parse tool_calls from JSON if present
          let toolCalls: ToolCall[] | undefined
          if (msg.tool_calls) {
            try {
              const parsed = typeof msg.tool_calls === 'string'
                ? JSON.parse(msg.tool_calls)
                : msg.tool_calls
              if (Array.isArray(parsed)) {
                toolCalls = parsed.map((tc: any) => ({
                  id: tc.id || '',
                  toolName: tc.name || '',
                  args: tc.arguments || {},
                  status: 'completed' as const
                }))
              }
            } catch (e) {
              console.warn('Failed to parse tool_calls:', e)
            }
          }

          return {
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content || '',
            toolCalls,
            createdAt: msg.created ? new Date(msg.created) : undefined
          }
        })

      setMessages(loadedMessages)
    } catch (error: any) {
      console.error('Failed to load messages:', error)
      setMessages([]) // Ensure messages are cleared on error
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

    if (!conversationId) {
      const error = new Error('Geen actieve conversatie geselecteerd')
      console.error(error.message)
      onError?.(error)
      return
    }

    const tempUserMessageId = `msg-${Date.now()}`
    const userMessage: Message = {
      id: tempUserMessageId,
      role: 'user',
      content: messageContent,
      createdAt: new Date()
    }

    let messageWithDocsForAPI = { ...userMessage }
    if (documents.filter(d => d.status === 'ready').length > 0) {
      const docTexts = documents
        .filter(d => d.status === 'ready' && d.ocrText)
        .map(d => `[Document: ${d.name}]\n${d.ocrText}`)
        .join('\n\n')
      messageWithDocsForAPI.content = `${messageContent}\n\n---\nAttached Documents:\n${docTexts}`
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const messagesForAPI = [...messages, messageWithDocsForAPI]

    let assistantTempId: string | null = null
    let assistantMessage = ''
    let userMessagePersisted = false

    try {
      const createdUserMessage = await pb.collection('messages').create({
        conversationId,
        userId: authUserId,
        role: 'user',
        content: messageContent
      })
      userMessagePersisted = true

      setMessages(prev => prev.map(msg =>
        msg.id === tempUserMessageId
          ? {
              ...msg,
              id: createdUserMessage.id,
              createdAt: createdUserMessage.created ? new Date(createdUserMessage.created) : msg.createdAt
            }
          : msg
      ))

      try {
        await pb.collection('conversations').update(conversationId, {
          lastMessage: messageContent.slice(0, 100),
          lastMessageAt: new Date().toISOString(),
          isActive: true
        })
      } catch (updateError) {
        console.error('Failed to update conversation metadata:', updateError)
      }

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

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        assistantTempId = `msg-${Date.now() + 1}`
        const placeholderCreatedAt = new Date()
        const placeholderId = assistantTempId

        type InternalToolCall = {
          id: string
          baseId: string
          occurrence: number
          toolName: string
          status: 'calling' | 'completed' | 'error'
          args?: Record<string, any>
          rawArgs?: string
          result?: any
        }

        const toolCallState = new Map<string, InternalToolCall>()
        const toolCallHistory: InternalToolCall[] = []
        const toolCallOccurrences = new Map<string, number>()
        const partIndexMap = new Map<number, { kind: string; toolCallId?: string }>()
        const reasoningBlocks: string[] = []
        let isThinking = false

        // Timeline to track events in chronological order
        const timeline: MessageEvent[] = []
        let currentThinkingIndex: number | null = null
        let currentTextIndex: number | null = null
        const toolCallTimelineIndex = new Map<string, number>()
        const permissionTimelineIndex = new Map<string, number>()

        const safeParseJson = (value: string) => {
          try {
            return JSON.parse(value)
          } catch {
            return undefined
          }
        }

        const unescapeEscapedString = (value: string) => {
          try {
            return JSON.parse(`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
          } catch {
            return value
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, '\\')
          }
        }

        const readSingleQuotedValue = (source: string, quoteIndex: number) => {
          if (quoteIndex < 0) return null
          let cursor = quoteIndex + 1
          let value = ''
          let escaping = false
          for (; cursor < source.length; cursor++) {
            const char = source[cursor]
            if (escaping) {
              value += char
              escaping = false
              continue
            }
            if (char === '\\') {
              escaping = true
              continue
            }
            if (char === "'") {
              break
            }
            value += char
          }
          if (cursor >= source.length) {
            return null
          }
          return { value, endIndex: cursor }
        }

        const parseToolReturnString = (raw: string) => {
          const trimmed = raw.trim()
          if (!trimmed.startsWith('ToolReturnPart(')) return undefined
          const toolMatch = trimmed.match(/tool_name='([^']*)'/)
          const contentIndex = trimmed.indexOf('content=')
          const contentQuote = contentIndex >= 0 ? trimmed.indexOf("'", contentIndex) : -1
          const content = readSingleQuotedValue(trimmed, contentQuote)
          if (!content) return undefined
          return {
            tool_name: toolMatch?.[1],
            content: unescapeEscapedString(content.value)
          }
        }

        const normalizeToolResult = (raw: unknown): unknown => {
          if (raw === undefined || raw === null) return raw
          if (typeof raw === 'string') {
            const trimmed = raw.trim()
            if (!trimmed) return ''
            const parsedJson = safeParseJson(trimmed)
            if (parsedJson !== undefined) return parsedJson
            const parsedToolReturn = parseToolReturnString(trimmed)
            if (parsedToolReturn) return parsedToolReturn
            return { content: unescapeEscapedString(trimmed) }
          }
          return raw
        }

        const applyResultToEntry = (entry: InternalToolCall, rawResult: unknown) => {
          const parsed = normalizeToolResult(rawResult)
          entry.result = parsed
          if (
            (!entry.toolName || entry.toolName === 'unknown_tool') &&
            parsed &&
            typeof parsed === 'object' &&
            'tool_name' in parsed &&
            typeof (parsed as { tool_name?: unknown }).tool_name === 'string'
          ) {
            entry.toolName = (parsed as { tool_name?: string }).tool_name as string
          }
        }

        const resolveToolName = (defaults: Partial<InternalToolCall>) => {
          if (defaults.toolName && typeof defaults.toolName === 'string') {
            return defaults.toolName
          }
          if (
            defaults.result &&
            typeof defaults.result === 'object' &&
            'tool_name' in defaults.result &&
            typeof (defaults.result as { tool_name?: unknown }).tool_name === 'string'
          ) {
            return (defaults.result as { tool_name?: string }).tool_name as string
          }
          return undefined
        }

        const createToolCallEntry = (toolCallId: string, defaults: Partial<InternalToolCall>): InternalToolCall => {
          const occurrence = toolCallOccurrences.get(toolCallId) ?? 0
          const entry: InternalToolCall = {
            id: occurrence === 0 ? toolCallId : `${toolCallId}#${occurrence}`,
            baseId: toolCallId,
            occurrence,
            toolName: resolveToolName(defaults) ?? 'unknown_tool',
            status: defaults.status ?? 'calling',
            args: defaults.args,
            rawArgs: defaults.rawArgs,
            result: undefined,
          }
          toolCallOccurrences.set(toolCallId, occurrence + 1)
          toolCallState.set(toolCallId, entry)
          toolCallHistory.push(entry)
          if (defaults.result !== undefined) {
            applyResultToEntry(entry, defaults.result)
          }
          return entry
        }

        const ensureToolCall = (toolCallId?: string | null, defaults: Partial<InternalToolCall> = {}) => {
          if (!toolCallId) return null
          const existing = toolCallState.get(toolCallId)
          const shouldStartNew = defaults.status === 'calling' && existing && existing.status !== 'calling'

          if (!existing || shouldStartNew) {
            const entry = createToolCallEntry(toolCallId, {
              ...defaults,
              toolName: defaults.toolName ?? existing?.toolName,
            })
            return entry
          }

          if (defaults.toolName !== undefined) {
            existing.toolName = defaults.toolName
          }
          if (defaults.status !== undefined) {
            existing.status = defaults.status
          }
          if (defaults.args !== undefined) {
            existing.args = defaults.args
          }
          if (defaults.rawArgs !== undefined) {
            existing.rawArgs = defaults.rawArgs
          }
          if (defaults.result !== undefined) {
            applyResultToEntry(existing, defaults.result)
          }
          toolCallState.set(toolCallId, existing)
          return existing
        }

        const syncAssistantState = () => {
          if (!assistantTempId) return
          const formattedToolCalls = toolCallHistory.map(call => {
            const parsedArgs = call.args ?? (call.rawArgs ? safeParseJson(call.rawArgs) : undefined)
            return {
              id: call.id,
              toolName: call.toolName,
              status: call.status,
              result: call.result,
              args: parsedArgs
            }
          })

          const activeReasoning = (() => {
            if (!isThinking) return undefined
            if (currentThinkingIndex === null) return undefined
            const event = timeline[currentThinkingIndex]
            return event && event.type === 'thinking' ? event.content : undefined
          })()
          const allReasoning = activeReasoning
            ? [...reasoningBlocks, activeReasoning]
            : reasoningBlocks

          const messageContent = assistantMessage
          const toolCalls = formattedToolCalls.length > 0 ? formattedToolCalls : undefined
          const reasoningValue = allReasoning.length > 0 ? [...allReasoning] : undefined
          const timelineEvents = timeline.length > 0 ? [...timeline] : undefined

          setMessages(prev => prev.map(msg =>
            msg.id === assistantTempId
              ? {
                  ...msg,
                  content: messageContent,
                  reasoning: reasoningValue,
                  toolCalls,
                  isThinking,
                  timeline: timelineEvents  // Only expose timeline once events exist
                }
              : msg
          ))
        }

        setMessages(prev => [...prev, {
          id: placeholderId,
          role: 'assistant',
          content: '',
          createdAt: placeholderCreatedAt,
          isThinking: false
        }])

        const ensureThinkingEvent = () => {
          if (currentThinkingIndex === null) {
            currentThinkingIndex = timeline.length
            timeline.push({ type: 'thinking', content: '', isActive: true })
            currentTextIndex = null
          }
          const event = timeline[currentThinkingIndex]
          if (event && event.type === 'thinking') {
            event.isActive = true
          }
          isThinking = true
          return event
        }

        const appendThinkingContent = (text: string) => {
          if (!text) return
          const event = ensureThinkingEvent()
          if (event && event.type === 'thinking') {
            event.content += text
          }
        }

        const finishThinkingBlock = () => {
          if (currentThinkingIndex !== null) {
            const event = timeline[currentThinkingIndex]
            if (event && event.type === 'thinking') {
              event.isActive = false
              event.content = event.content.trim()
              if (event.content) {
                reasoningBlocks.push(event.content)
              }
            }
          }
          currentThinkingIndex = null
          isThinking = false
        }

        const appendTextToTimeline = (text: string) => {
          if (!text) return
          if (currentTextIndex === null || timeline[currentTextIndex]?.type !== 'text') {
            currentTextIndex = timeline.length
            timeline.push({ type: 'text', content: text })
          } else {
            const event = timeline[currentTextIndex]
            if (event && event.type === 'text') {
              event.content += text
            }
          }
        }

        const syncTimelineToolCall = (call: InternalToolCall) => {
          if (!call.id) return
          const formatted = {
            id: call.id,
            toolName: call.toolName,
            status: call.status,
            result: call.result,
            args: call.args ?? (call.rawArgs ? safeParseJson(call.rawArgs) : undefined)
          }
          const existingIndex = toolCallTimelineIndex.get(call.id)
          if (existingIndex === undefined) {
            currentTextIndex = null
            toolCallTimelineIndex.set(call.id, timeline.length)
            timeline.push({ type: 'tool_call', toolCall: formatted })
          } else {
            const event = timeline[existingIndex]
            if (event && event.type === 'tool_call') {
              event.toolCall = { ...event.toolCall, ...formatted }
            } else {
              timeline[existingIndex] = { type: 'tool_call', toolCall: formatted }
            }
          }
        }

        const addPermissionToTimeline = (permission: PendingPermission) => {
          currentTextIndex = null
          permissionTimelineIndex.set(permission.permissionId, timeline.length)
          timeline.push({ type: 'permission_request', permission, status: 'pending' })
        }

        const updatePermissionStatus = (permissionId: string, status: 'approved' | 'denied') => {
          const existingIndex = permissionTimelineIndex.get(permissionId)
          if (existingIndex !== undefined) {
            const event = timeline[existingIndex]
            if (event && event.type === 'permission_request') {
              event.status = status
            }
          }
        }

        const updateToolCallFromPart = (part: any, index: number) => {
          if (!part) return
          partIndexMap.set(index, { kind: part.part_kind, toolCallId: part.tool_call_id })

          if (part.part_kind === 'tool-call' || part.part_kind === 'builtin-tool-call') {
            const entry = ensureToolCall(part.tool_call_id, {
              toolName: part.tool_name,
              status: 'calling'
            })
            if (!entry) return
            if (typeof part.args === 'string') {
              entry.rawArgs = part.args
              entry.args = safeParseJson(part.args) ?? entry.args
            } else if (part.args && typeof part.args === 'object') {
              entry.args = part.args
            }
            syncTimelineToolCall(entry)
            currentTextIndex = null
          } else if (part.part_kind === 'tool-return' || part.part_kind === 'builtin-tool-return') {
            const entry = ensureToolCall(part.tool_call_id, {
              toolName: part.tool_name
            })
            if (!entry) return
            entry.status = 'completed'
            applyResultToEntry(entry, part.content)
            syncTimelineToolCall(entry)
            currentTextIndex = null
          } else if (part.part_kind === 'thinking') {
            if (typeof part.content === 'string' && part.content) {
              appendThinkingContent(part.content)
            } else {
              ensureThinkingEvent()
            }
          } else if (part.part_kind === 'text') {
            if (typeof part.content === 'string') {
              assistantMessage += part.content
              appendTextToTimeline(part.content)
            }
          }
        }

        const updateToolCallFromDelta = (delta: any, index: number) => {
          if (!delta) return
          if (delta.part_delta_kind === 'thinking') {
            if (typeof delta.content_delta === 'string') {
              appendThinkingContent(delta.content_delta)
            }
            if (delta.content_delta === undefined && delta.signature_delta === undefined) {
              finishThinkingBlock()
            }
            return
          }
          if (delta.part_delta_kind === 'text') {
            if (typeof delta.content_delta === 'string') {
              assistantMessage += delta.content_delta
              appendTextToTimeline(delta.content_delta)
            }
            return
          }
          if (delta.part_delta_kind === 'tool_call') {
            const meta = partIndexMap.get(index)
            const toolCallId = delta.tool_call_id || meta?.toolCallId
            const entry = ensureToolCall(toolCallId)
            if (!entry) return
            if (typeof delta.tool_name_delta === 'string') {
              entry.toolName = `${entry.toolName}${delta.tool_name_delta}`
            }
            if (typeof delta.args_delta === 'string') {
              entry.rawArgs = `${entry.rawArgs ?? ''}${delta.args_delta}`
              const parsed = safeParseJson(entry.rawArgs)
              if (parsed) {
                entry.args = parsed
              }
            } else if (delta.args_delta && typeof delta.args_delta === 'object') {
              entry.args = { ...(entry.args ?? {}), ...delta.args_delta }
            }
            if (delta.tool_call_id) {
              partIndexMap.set(index, { kind: 'tool-call', toolCallId: delta.tool_call_id })
            }
            syncTimelineToolCall(entry)
            currentTextIndex = null
          }
        }

        const updateToolCallResult = (result: any) => {
          if (!result) return
          const entry = ensureToolCall(result.tool_call_id, {
            toolName: result.tool_name
          })
          if (!entry) return

          if (result.part_kind === 'tool-return' || result.part_kind === 'builtin-tool-return') {
            entry.status = 'completed'
            applyResultToEntry(entry, result.content)
            syncTimelineToolCall(entry)
            currentTextIndex = null
          } else if (result.part_kind === 'retry-prompt') {
            entry.status = 'error'
            const parsed = typeof result.content === 'string'
              ? { error: result.content }
              : {
                  error: 'Tool retry requested',
                  details: normalizeToolResult(result.content)
                }
            entry.result = parsed
            syncTimelineToolCall(entry)
            currentTextIndex = null
          }
        }

        const handleAgentEvent = (event: any) => {
          switch (event.event_kind) {
            case 'part_start':
              updateToolCallFromPart(event.part, event.index)
              break
            case 'part_delta':
              updateToolCallFromDelta(event.delta, event.index)
              break
            case 'final_result':
              finishThinkingBlock()
              break
            case 'function_tool_call':
              if (event.part) {
                const entry = ensureToolCall(event.part.tool_call_id, {
                  toolName: event.part.tool_name,
                  status: 'calling'
                })
                if (entry) {
                  if (typeof event.part.args === 'string') {
                    entry.rawArgs = event.part.args
                    entry.args = safeParseJson(event.part.args) ?? entry.args
                  } else if (event.part.args && typeof event.part.args === 'object') {
                    entry.args = event.part.args
                  }
                  syncTimelineToolCall(entry)
                  currentTextIndex = null
                }
              }
              break
            case 'function_tool_result':
              updateToolCallResult(event.result)
              finishThinkingBlock()
              break
            case 'permission_required':
              // Tool requires user permission before execution - add to timeline as inline message
              {
                const permission: PendingPermission = {
                  permissionId: event.permission_id,
                  toolName: event.tool_name,
                  toolArgs: event.tool_args || {},
                  toolCallId: event.tool_call_id,  // pydantic-ai's tool call ID
                  conversationId: event.conversation_id || '',
                  agent: event.agent || ''
                }
                // Add permission to timeline for inline display
                addPermissionToTimeline(permission)
                // Also keep in pendingPermissions for tracking (but not for overlay display)
                setPendingPermissions(prev => [...prev, permission])
                onPermissionRequired?.(permission)
              }
              break
            case 'permission_denied':
              // User denied permission - update timeline status
              updatePermissionStatus(event.permission_id, 'denied')
              setPendingPermissions(prev =>
                prev.filter(p => p.permissionId !== event.permission_id)
              )
              break
            case 'permission_timeout':
              // Permission request timed out - update timeline status to denied
              updatePermissionStatus(event.permission_id, 'denied')
              setPendingPermissions(prev =>
                prev.filter(p => p.permissionId !== event.permission_id)
              )
              break
            default:
              break
          }

          syncAssistantState()
        }

        const handleLegacyEvent = (parsed: any) => {
          if (parsed.type === 'thinking_start') {
            ensureThinkingEvent()
          } else if (parsed.type === 'reasoning') {
            if (typeof parsed.content === 'string') {
              appendThinkingContent(parsed.content)
            }
          } else if (parsed.type === 'thinking_done') {
            finishThinkingBlock()
          } else if (parsed.type === 'tool_call') {
            const entry = ensureToolCall(parsed.tool_call_id ?? `tool-${Date.now()}`, {
              toolName: parsed.tool_name,
              status: parsed.status ?? 'completed',
              result: parsed.result,
              args: typeof parsed.args === 'object' ? parsed.args : undefined
            })
            if (entry) {
              entry.status = parsed.status ?? 'completed'
              if (parsed.result !== undefined) {
                applyResultToEntry(entry, parsed.result)
              }
              if (typeof parsed.args === 'object') {
                entry.args = parsed.args
              }
              syncTimelineToolCall(entry)
              currentTextIndex = null
            }
          } else if (parsed.type === 'delta' && parsed.delta) {
            assistantMessage += parsed.delta
            appendTextToTimeline(parsed.delta)
          } else if (parsed.type === 'text-delta' && parsed.delta) {
            assistantMessage += parsed.delta
            appendTextToTimeline(parsed.delta)
          } else if (typeof parsed.delta === 'string') {
            assistantMessage += parsed.delta
            appendTextToTimeline(parsed.delta)
          } else if (typeof parsed.text === 'string') {
            assistantMessage += parsed.text
            appendTextToTimeline(parsed.text)
          }

          if (parsed.done === true && typeof parsed.full_text === 'string') {
            assistantMessage = parsed.full_text
            if (currentTextIndex === null || timeline[currentTextIndex]?.type !== 'text') {
              currentTextIndex = timeline.length
              timeline.push({ type: 'text', content: parsed.full_text })
            } else {
              const event = timeline[currentTextIndex]
              if (event && event.type === 'text') {
                event.content = parsed.full_text
              }
            }
          }

          syncAssistantState()
        }

        // Buffer for incomplete SSE lines (long JSON events may span multiple chunks)
        let lineBuffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Prepend any buffered partial line from previous chunk
          const fullChunk = lineBuffer + chunk
          const lines = fullChunk.split('\n')

          // The last element might be incomplete if chunk didn't end with newline
          // Buffer it for the next iteration
          lineBuffer = lines.pop() || ''

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line) continue

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (!data || data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)

                if (parsed.error || parsed.errorText) {
                  throw new Error(parsed.error || parsed.errorText)
                }

                if (parsed.event_kind) {
                  handleAgentEvent(parsed)
                } else {
                  handleLegacyEvent(parsed)
                }
              } catch {
                // Only append as text if it doesn't look like truncated JSON
                // Truncated JSON starts with { but won't parse - skip it
                if (!data.startsWith('{') && !data.startsWith('[')) {
                  assistantMessage += data
                  appendTextToTimeline(data)
                  syncAssistantState()
                }
                // If it looks like truncated JSON, it was likely a buffering issue
                // that shouldn't happen anymore with proper line buffering
                console.warn('[SSE] Skipping unparseable JSON-like data:', data.slice(0, 100))
              }
            } else if (/^\d+:/.test(line)) {
              const content = line.slice(line.indexOf(':') + 1).trim()
              if (!content) continue

              try {
                const parsed = JSON.parse(content)
                if (typeof parsed === 'string') {
                  assistantMessage += parsed
                  appendTextToTimeline(parsed)
                }
              } catch {
                assistantMessage += content
                appendTextToTimeline(content)
              }

              syncAssistantState()
            }
          }
        }

        // Process any remaining buffered content after stream ends
        if (lineBuffer.trim()) {
          const line = lineBuffer.trim()
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data)
                if (parsed.event_kind) {
                  handleAgentEvent(parsed)
                } else {
                  handleLegacyEvent(parsed)
                }
              } catch {
                // Final buffer parse failed - likely incomplete data, skip it
                console.warn('[SSE] Final buffer parse failed:', data.slice(0, 100))
              }
            }
          }
        }
      }

      const finalAssistantMessage = assistantMessage.trim()

      if (assistantTempId) {
        if (finalAssistantMessage) {
          // Update temp message with final content
          setMessages(prev => prev.map(msg =>
            msg.id === assistantTempId
              ? { ...msg, content: finalAssistantMessage }
              : msg
          ))

          // Backend now saves all messages (including tool calls) to PocketBase
          // Give backend a moment to persist, then reload to get authoritative state
          // This ensures tool calls are properly loaded with their persisted IDs
          await new Promise(resolve => setTimeout(resolve, 500))
          await loadMessages()

          // Update conversation metadata
          try {
            await pb.collection('conversations').update(conversationId, {
              lastMessage: finalAssistantMessage.slice(0, 100),
              lastMessageAt: new Date().toISOString()
            })
          } catch (updateError) {
            console.error('Failed to update conversation metadata:', updateError)
          }
        } else {
          setMessages(prev => prev.filter(msg => msg.id !== assistantTempId))
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error)
      onError?.(error as Error)

      if (!userMessagePersisted) {
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId))
      }

      if (assistantTempId) {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantTempId
            ? { ...msg, content: 'Er is een fout opgetreden. Probeer het opnieuw.' }
            : msg
        ))
      } else if (error?.message !== 'UNAUTHORIZED') {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: 'Er is een fout opgetreden. Probeer het opnieuw.'
        }])
      }

      if (error?.message === 'UNAUTHORIZED') {
        return
      }
    } finally {
      setIsLoading(false)
    }
  }, [assistantType, chatEndpoint, conversationId, documents, input, loadMessages, logout, messages, onError, onPermissionRequired])

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
    removeDocument,
    // Permission system
    pendingPermissions,
    approvePermission,
    denyPermission
  }
}
