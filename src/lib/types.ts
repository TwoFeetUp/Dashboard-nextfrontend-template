export interface ToolCall {
  id: string
  toolName: string
  args?: any
  result?: any
  status: 'calling' | 'completed' | 'error'
}

export type MessageEvent =
  | { type: 'thinking'; content: string; isActive?: boolean }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'text'; content: string }

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  reasoning?: string[]
  isThinking?: boolean
  timeline?: MessageEvent[]  // Chronological order of events
  createdAt?: Date
}

export interface DocumentAttachment {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  uploadedAt: Date
  processedAt?: Date
  content?: string // Base64 content
  ocrText?: string
  characterCount?: number
  pageCount?: number
  error?: string
}

export interface ElicitationRequest {
  id: string
  message: string
  requestedSchema?: Record<string, unknown> | null
  conversationId?: string
  agent?: string
}

