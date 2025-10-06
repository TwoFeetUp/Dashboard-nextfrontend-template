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
        content: ''
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      if (reader) {
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
        let currentReasoning = ''
        let isThinking = false
        let assistantContent = ''

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
          const reasoningArray = currentReasoning ? [currentReasoning] : undefined
          const toolCalls = formattedToolCalls.length > 0 ? formattedToolCalls : undefined
          const messageId = assistantMessage.id
          assistantMessage = {
            ...assistantMessage,
            content: assistantContent,
            toolCalls,
            reasoning: reasoningArray,
            isThinking,
          }

          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? assistantMessage : msg
          ))
        }

        const updateReasoning = (text?: string, append = false) => {
          if (typeof text !== 'string') {
            if (!append) {
              currentReasoning = ''
            }
            return
          }
          currentReasoning = append ? currentReasoning + text : text
          if (currentReasoning) {
            isThinking = true
          }
        }

        const finishThinking = () => {
          isThinking = false
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
          } else if (part.part_kind === 'tool-return' || part.part_kind === 'builtin-tool-return') {
            const entry = ensureToolCall(part.tool_call_id, {
              toolName: part.tool_name
            })
            if (!entry) return
            entry.status = 'completed'
            applyResultToEntry(entry, part.content)
          } else if (part.part_kind === 'thinking') {
            updateReasoning(part.content, false)
            isThinking = true
          } else if (part.part_kind === 'text') {
            if (typeof part.content === 'string') {
              assistantContent += part.content
            }
          }
        }

        const updateToolCallFromDelta = (delta: any, index: number) => {
          if (!delta) return
          if (delta.part_delta_kind === 'thinking') {
            if (typeof delta.content_delta === 'string') {
              updateReasoning(delta.content_delta, true)
            }
            if (delta.content_delta === undefined && delta.signature_delta === undefined) {
              finishThinking()
            }
            return
          }
          if (delta.part_delta_kind === 'text') {
            if (typeof delta.content_delta === 'string') {
              assistantContent += delta.content_delta
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
          } else if (result.part_kind === 'retry-prompt') {
            entry.status = 'error'
            const parsed = typeof result.content === 'string'
              ? { error: result.content }
              : {
                  error: 'Tool retry requested',
                  details: normalizeToolResult(result.content)
                }
            entry.result = parsed
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
              finishThinking()
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
                }
              }
              break
            case 'function_tool_result':
              updateToolCallResult(event.result)
              finishThinking()
              break
            default:
              break
          }

          syncAssistantState()
        }

        const handleLegacyEvent = (parsed: any) => {
          if (parsed.type === 'content') {
            assistantContent += parsed.content ?? ''
          } else if (parsed.type === 'tool_call') {
            const entry = ensureToolCall(parsed.tool_call_id ?? `tool-${Date.now()}`, {
              toolName: parsed.tool_name,
              status: parsed.status ?? 'calling',
              args: typeof parsed.args === 'object' ? parsed.args : undefined,
              result: parsed.result,
            })
            if (entry) {
              if (parsed.status) {
                entry.status = parsed.status
              }
              if (parsed.result !== undefined) {
                applyResultToEntry(entry, parsed.result)
              }
              if (typeof parsed.args === 'object') {
                entry.args = parsed.args
              }
            }
          } else if (parsed.type === 'tool_result') {
            updateToolCallResult(parsed.toolCall)
          } else if (parsed.type === 'delta' && parsed.delta) {
            assistantContent += parsed.delta
          } else if (parsed.type === 'text-delta' && parsed.delta) {
            assistantContent += parsed.delta
          }

          if (parsed.done === true && typeof parsed.full_text === 'string') {
            assistantContent = parsed.full_text
          }

          syncAssistantState()
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

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
              } catch (error) {
                console.error('Failed to parse SSE event:', error)
                assistantContent += data
                syncAssistantState()
              }
            } else if (/^\d+:/.test(line)) {
              const content = line.slice(line.indexOf(':') + 1).trim()
              if (!content) continue

              try {
                const parsed = JSON.parse(content)
                if (typeof parsed === 'string') {
                  assistantContent += parsed
                }
              } catch {
                assistantContent += content
              }

              syncAssistantState()
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
