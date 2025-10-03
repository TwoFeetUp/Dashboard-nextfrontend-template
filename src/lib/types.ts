export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  createdAt?: Date
}

export interface ToolCall {
  id: string
  toolName: string
  args?: any
  result?: any
  status: 'calling' | 'completed' | 'error'
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